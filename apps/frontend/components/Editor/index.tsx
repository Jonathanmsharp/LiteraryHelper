import React, { useState, useMemo, useCallback } from 'react';
import { createEditor, Descendant, Node, Text, Range, Path, BaseEditor, NodeEntry, Editor as SlateEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useAnalysis } from '../../lib/hooks/useAnalysis';
import { useSidebarStore } from '../Sidebar/RuleSidebar';

// Type definitions
type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { 
  text: string; 
  bold?: boolean; 
  italic?: boolean; 
  underline?: boolean;
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

type HighlightDecoration = Range & {
  highlight: {
    type: 'error' | 'warning' | 'info';
    ruleId: string;
    matchId: string;
    suggestion: string;
    explanation: string;
    matchText: string;
  };
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
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

// Helper function to get the absolute text offset for a given path
const getAbsoluteOffset = (editor: SlateEditor, path: Path): number => {
  let offset = 0;
  
  for (const [node, nodePath] of Node.texts(editor)) {
    if (Path.equals(nodePath, path)) {
      break;
    }
    offset += node.text.length;
  }
  
  return offset;
};

interface EditorProps {
  defaultValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (text: string) => void;
}

const Editor = React.memo(({ defaultValue = defaultEditorValue, placeholder = 'Start writing...', readOnly = false, onChange }: EditorProps) => {
  const [value, setValue] = useState<Descendant[]>(defaultValue);
  const { analyzeText, isLoading, results, error } = useAnalysis();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const { openSidebar } = useSidebarStore();

  // Create editor instance
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Manual analysis function
  const handleAnalyze = useCallback(async () => {
    const textContent = value.map((node) => Node.string(node)).join('\n');
    
    if (textContent.trim().length < 10) {
      alert('Please enter at least 10 characters before analyzing.');
      return;
    }
    
    console.log('[Editor] Manual analysis triggered for:', textContent.substring(0, 50) + '...');
    setHasAnalyzed(true);
    analyzeText(textContent);
  }, [value, analyzeText]);

  // Decoration function for highlighting
  const decorate = useCallback(([node, path]: NodeEntry): Range[] => {
    const ranges: HighlightDecoration[] = [];
    
    if (!results || results.length === 0 || !hasAnalyzed || !Text.isText(node)) {
      return ranges;
    }
    
    const nodeText = node.text;
    const nodeStart = getAbsoluteOffset(editor, path);
    const nodeEnd = nodeStart + nodeText.length;
    
    console.log('[decorate] Processing node at path', path, 'with text:', nodeText.substring(0, 20) + '...');
    console.log('[decorate] Node range:', nodeStart, '-', nodeEnd);
    
    results.forEach((match, index) => {
      const matchStart = match.range.start;
      const matchEnd = match.range.end;
      
      console.log('[decorate] Checking match:', match.range.text, 'at', matchStart, '-', matchEnd);
      
      // Check if this match overlaps with the current text node
      if (matchStart < nodeEnd && matchEnd > nodeStart) {
        // Calculate the intersection
        const intersectionStart = Math.max(matchStart, nodeStart);
        const intersectionEnd = Math.min(matchEnd, nodeEnd);
        
        // Convert to node-relative offsets
        const relativeStart = intersectionStart - nodeStart;
        const relativeEnd = intersectionEnd - nodeStart;
        
        console.log('[decorate] Adding highlight for:', match.range.text, 'at relative offset', relativeStart, '-', relativeEnd);
        
        ranges.push({
          anchor: { path, offset: relativeStart },
          focus: { path, offset: relativeEnd },
          highlight: {
            type: match.severity,
            ruleId: match.ruleId,
            matchId: `${match.ruleId}-${index}`,
            suggestion: match.suggestion || '',
            explanation: match.explanation || '',
            matchText: match.range.text
          }
        });
      }
    });
    
    console.log('[decorate] Generated', ranges.length, 'decorations for node');
    return ranges;
  }, [results, hasAnalyzed, editor]);

  // Leaf renderer with highlighting
  const renderLeaf = useCallback(({ attributes, children, leaf }: any) => {
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

    // Apply highlighting from decorations
    if (leaf.highlight) {
      const severity = leaf.highlight.type;
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
      style.margin = '0 1px';
    }

    // Handle click on highlighted text
    const handleClick = (e: React.MouseEvent) => {
      if (leaf.highlight) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[Leaf] Clicked on highlight:', leaf.highlight);
        
        const match = {
          id: leaf.highlight.matchId,
          ruleId: leaf.highlight.ruleId,
          range: { start: 0, end: 0, text: leaf.highlight.matchText },
          severity: leaf.highlight.type,
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
        title={leaf.highlight ? `${leaf.highlight.ruleId}: ${leaf.highlight.suggestion}` : undefined}
      >
        {children}
      </span>
    );
  }, [openSidebar]);

  // Reset analysis state when text changes
  const handleTextChange = useCallback((newValue: Descendant[]) => {
    setValue(newValue);
    if (onChange) {
      const textContent = newValue.map((node) => Node.string(node)).join('\n');
      onChange(textContent);
    }
    // Reset analysis state when text changes
    if (hasAnalyzed) {
      setHasAnalyzed(false);
    }
  }, [onChange, hasAnalyzed]);

  return (
    <div className="editor-container">
      <div className="editor-controls">
        <button 
          onClick={handleAnalyze}
          disabled={isLoading || value.map((node) => Node.string(node)).join('\n').trim().length < 10}
          className="analyze-button"
        >
          {isLoading ? (
            <>
              <div className="button-spinner"></div>
              Analyzing...
            </>
          ) : (
            <>
              🔍 Analyze Writing
            </>
          )}
        </button>
        {hasAnalyzed && results && results.length > 0 && (
          <div className="analysis-summary">
            Found {results.length} writing suggestions
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-indicator">
          <span>Analysis failed: {error}</span>
        </div>
      )}
      
      <Slate
        editor={editor}
        initialValue={value}
        onValueChange={handleTextChange}
      >
        <Editable
          decorate={decorate}
          renderElement={Element}
          renderLeaf={renderLeaf}
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
        
        .editor-controls {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding: 10px 0;
        }
        
        .analyze-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .analyze-button:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .analyze-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        
        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff40;
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .analysis-summary {
          color: #059669;
          font-size: 14px;
          font-weight: 500;
        }
        
        .error-indicator {
          background: #fef2f2;
          border: 1px solid #ef4444;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
          color: #dc2626;
          margin-bottom: 15px;
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
