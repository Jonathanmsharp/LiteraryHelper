import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createEditor, Descendant, Node, Text, Range, Path, Transforms, BaseEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor, HistoryEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { debounce } from 'lodash/debounce';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useSidebarStore } from '../Sidebar/RuleSidebar';

// Type definitions
type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { 
  text: string; 
  bold?: boolean; 
  italic?: boolean; 
  underline?: boolean;
  highlight?: {
    matchId: string;
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
    explanation?: string;
  };
};

type AnalysisMatch = {
  id: string;
  ruleId: string;
  start: number;
  end: number;
  text: string;
  suggestion: string;
  explanation: string;
  severity: 'error' | 'warning' | 'info';
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Default editor value
const defaultEditorValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// Element renderer
const Element = ({ attributes, children }: any) => {
  return <p {...attributes}>{children}</p>;
};

// Leaf renderer with highlighting
const Leaf = ({ attributes, children, leaf }: any) => {
  let style: React.CSSProperties = {};

  // Apply text formatting
  if (leaf.bold) {
    style.fontWeight = 'bold';
  }
  if (leaf.italic) {
    style.fontStyle = 'italic';
  }
  if (leaf.underline) {
    style.textDecoration = 'underline';
  }

  // Apply highlighting
  if (leaf.highlight) {
    const severity = leaf.highlight.severity;
    switch (severity) {
      case 'error':
        style.backgroundColor = '#FEE2E2';
        style.borderBottom = '2px solid #EF4444';
        break;
      case 'warning':
        style.backgroundColor = '#FEF3C7';
        style.borderBottom = '2px solid #F59E0B';
        break;
      case 'info':
        style.backgroundColor = '#DBEAFE';
        style.borderBottom = '2px solid #3B82F6';
        break;
    }
    style.cursor = 'pointer';
    style.borderRadius = '2px';
    style.padding = '1px 2px';
  }

  // Handle click on highlighted text
  const handleClick = (e: React.MouseEvent) => {
    if (leaf.highlight) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[Leaf] Clicked on highlight:', leaf.highlight);
      
      // Get the sidebar store and open it
      const { openSidebar } = useSidebarStore.getState();
      const match = {
        id: leaf.highlight.matchId,
        ruleId: leaf.highlight.ruleId,
        range: { start: 0, end: 0, text: leaf.text },
        severity: leaf.highlight.severity,
        suggestion: leaf.highlight.suggestion,
        explanation: leaf.highlight.explanation,
      };
      
      console.log('[Leaf] Opening sidebar with match:', match);
      openSidebar(match);
    }
  };

  return (
    <span
      {...attributes}
      style={style}
      onClick={leaf.highlight ? handleClick : undefined}
    >
      {children}
    </span>
  );
};

// Helper function to convert absolute text positions to Slate path and offset
function getSlateLocation(editor: any, offset: number): [Path, number] | null {
  let currentOffset = 0;
  
  for (const [node, path] of Node.texts(editor)) {
    const textLength = node.text.length;
    
    if (currentOffset <= offset && offset <= currentOffset + textLength) {
      return [path, offset - currentOffset];
    }
    
    currentOffset += textLength;
  }
  
  return null;
}

// Clear all highlights from the editor
function clearHighlights(editor: any) {
  const textNodes = Array.from(Node.texts(editor));
  
  textNodes.forEach(([node, path]) => {
    if (node.highlight) {
      Transforms.setNodes(
        editor,
        { highlight: undefined },
        { at: path }
      );
    }
  });
}

// Apply highlights to the editor
function applyHighlights(editor: any, matches: AnalysisMatch[]) {
  console.log('[applyHighlights] Starting with', matches.length, 'matches');
  
  // Clear existing highlights first
  clearHighlights(editor);
  
  // Sort matches by start position (descending) to avoid offset issues
  const sortedMatches = [...matches].sort((a, b) => b.start - a.start);
  
  sortedMatches.forEach((match) => {
    const { start, end, ruleId, severity, suggestion, explanation } = match;
    
    // Get the text content to verify the match
    const textContent = Node.string(editor);
    const matchedText = textContent.slice(start, end);
    
    if (matchedText !== match.text) {
      console.warn(`Text mismatch for match ${match.id}: expected "${match.text}", got "${matchedText}"`);
      return;
    }
    
    // Find the Slate location for the start of the match
    const startLocation = getSlateLocation(editor, start);
    if (!startLocation) {
      console.warn(`Could not find Slate location for match ${match.id} at position ${start}`);
      return;
    }
    
    const [startPath, startOffset] = startLocation;
    const endLocation = getSlateLocation(editor, end);
    
    if (!endLocation) {
      console.warn(`Could not find Slate location for match ${match.id} at position ${end}`);
      return;
    }
    
    const [endPath, endOffset] = endLocation;
    
    // Create the range for the match
    const range: Range = {
      anchor: { path: startPath, offset: startOffset },
      focus: { path: endPath, offset: endOffset },
    };
    
    // Apply the highlight
    Transforms.setNodes(
      editor,
      {
        highlight: {
          matchId: match.id,
          ruleId,
          severity,
          suggestion,
          explanation,
        },
      },
      {
        at: range,
        match: Text.isText,
        split: true,
      }
    );
    
    console.log(`[applyHighlights] Applied highlight for "${match.text}" (${ruleId})`);
  });
}

interface EditorProps {
  defaultValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (text: string) => void;
}

const Editor = React.memo(({ defaultValue = defaultEditorValue, placeholder = 'Start writing...', readOnly = false, onChange }: EditorProps) => {
  const [value, setValue] = useState<Descendant[]>(defaultValue);
  const { analyzeText, isLoading, results, error } = useAnalysis();
  const isApplyingHighlights = useRef(false);

  // Create editor instance
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  const debouncedAnalyze = useCallback(
    debounce((text: string) => {
      if (text.trim().length > 10) {
        console.log('[Editor] Starting analysis for:', text.substring(0, 50) + '...');
        analyzeText(text);
      }
    }, 1000),
    [analyzeText]
  );

  const debouncedOnChange = useCallback(
    debounce((value: Descendant[]) => {
      const textContent = value.map((node) => Node.string(node)).join('\n');
      if (onChange) onChange(textContent);
      debouncedAnalyze(textContent);
    }, 500),
    [onChange, debouncedAnalyze]
  );

  // Apply highlights when analysis results change
  useEffect(() => {
    if (results && results.length > 0 && !isApplyingHighlights.current) {
      console.log('[Editor] Applying highlights for', results.length, 'matches');
      isApplyingHighlights.current = true;
      
      // Use setTimeout to make this asynchronous and prevent blocking
      setTimeout(() => {
        try {
          // Convert results to analysis matches
          const analysisMatches: AnalysisMatch[] = results.map((match, index) => ({
            id: `${match.ruleId}-${index}`,
            ruleId: match.ruleId,
            start: match.range.start,
            end: match.range.end,
            text: match.range.text,
            suggestion: match.suggestion ?? '',
            explanation: match.explanation ?? '',
            severity: match.severity,
          }));

          // Apply highlights
          applyHighlights(editor, analysisMatches);
        } catch (error) {
          console.error('[Editor] Error applying highlights:', error);
        } finally {
          isApplyingHighlights.current = false;
        }
      }, 0);
    }
  }, [results]); // Removed 'editor' from dependencies to prevent infinite loop

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedAnalyze.cancel();
      debouncedOnChange.cancel();
    };
  }, [debouncedAnalyze, debouncedOnChange]);

  return (
    <div className="editor-container">
      {isLoading && (
        <div className="analysis-indicator">
          <div className="loading-spinner"></div>
          <span>Analyzing...</span>
        </div>
      )}
      {error && (
        <div className="error-indicator">
          <span>Analysis failed: {error}</span>
        </div>
      )}
      <Slate
        editor={editor}
        value={value}
        onChange={(newValue) => {
          setValue(newValue);
          debouncedOnChange(newValue);
        }}
      >
        <Editable
          renderElement={Element}
          renderLeaf={Leaf}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{
            minHeight: '250px',
            outline: 'none',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5',
          }}
        />
      </Slate>

      <style jsx>{`
        .editor-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .analysis-indicator {
          position: absolute;
          top: -40px;
          right: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
          color: #0369a1;
          z-index: 10;
        }
        
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e0e7ff;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .error-indicator {
          position: absolute;
          top: -40px;
          right: 0;
          background: #fef2f2;
          border: 1px solid #ef4444;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
          color: #dc2626;
          z-index: 10;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
