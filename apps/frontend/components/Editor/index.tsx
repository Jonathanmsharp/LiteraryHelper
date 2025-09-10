import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createEditor, Descendant, Node, Text, BaseEditor, Editor as SlateEditor, Element as SlateElement, Range, Transforms, Path } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { debounce } from 'lodash';
import { useAnalysis } from '../../lib/hooks/useAnalysis';
import { useSidebarStore } from '../Sidebar/RuleSidebar';

// Enhanced types for analysis results
interface TextRange {
  start: number;
  end: number;
  text: string;
}

interface AnalysisMatch {
  id: string;
  ruleId: string;
  start: number;
  end: number;
  text: string;
  suggestion: string;
  explanation: string;
  severity: 'error' | 'warning' | 'info';
}

type CustomElement = {
  type: 'paragraph' | 'heading';
  level?: number;
  children: CustomText[];
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: {
    color: string;
    ruleId: string;
    matchId: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
    explanation: string;
  };
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

type EditorProps = {
  defaultValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (text: string) => void;
};

const defaultEditorValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const Element = ({ attributes, children, element }: any) => {
  switch (element.type) {
    case 'heading':
      const HeadingTag = `h${element.level || 1}` as keyof JSX.IntrinsicElements;
      return <HeadingTag {...attributes}>{children}</HeadingTag>;
    default: return <p {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  let style: React.CSSProperties = {};
  
  if (leaf.bold) style.fontWeight = 'bold';
  if (leaf.italic) style.fontStyle = 'italic';
  if (leaf.underline) style.textDecoration = 'underline';
  
  if (leaf.highlight) {
    switch (leaf.highlight.severity) {
      case 'error':
        style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        style.textDecoration = 'underline wavy red';
        style.cursor = 'pointer';
        break;
      case 'warning':
        style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
        style.textDecoration = 'underline wavy orange';
        style.cursor = 'pointer';
        break;
      case 'info':
        style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
        style.textDecoration = 'underline dotted blue';
        style.cursor = 'pointer';
        break;
    }
  }

  return (
    <span
      {...attributes}
      style={style}
      onClick={leaf.highlight ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Open sidebar with rule details
        const { openSidebar } = useSidebarStore.getState();
        const match = {
          id: leaf.highlight.matchId,
          ruleId: leaf.highlight.ruleId,
          range: { start: 0, end: 0, text: leaf.text },
          severity: leaf.highlight.severity,
          suggestion: leaf.highlight.suggestion,
          explanation: leaf.highlight.explanation,
        };
        openSidebar(match);
      } : undefined}
    >
      {children}
    </span>
  );
};

// Helper function to convert absolute text positions to Slate path and offset
function getSlateLocation(editor: SlateEditor, offset: number): [Path, number] | null {
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

// Helper to clear all highlights from the editor
function clearHighlights(editor: SlateEditor): void {
  // Remove all highlight marks from the entire document
  for (const [node, path] of Node.texts(editor)) {
    if (node.highlight) {
      Transforms.unsetNodes(editor, 'highlight', { at: path });
    }
  }
}

// Apply highlights to the editor based on analysis results
function applyHighlights(editor: SlateEditor, matches: AnalysisMatch[]): void {
  // 1. Clear existing highlights
  clearHighlights(editor);

  // 2. Process matches from earliest → latest to avoid range clashes
  const sorted = [...matches].sort((a, b) => a.start - b.start);

  sorted.forEach((match) => {
    const startLoc = getSlateLocation(editor, match.start);
    const endLoc   = getSlateLocation(editor, match.end);

    if (!startLoc || !endLoc) {
      console.warn('[Editor] Unable to resolve Slate range for match', match);
      return;
    }

    const range: Range = {
      anchor: { path: startLoc[0], offset: startLoc[1] },
      focus:  { path: endLoc[0],   offset: endLoc[1] }
    };

    // Apply highlight by setting a custom Text property.
    // `split: true` ensures only the exact span receives the mark.
    Transforms.setNodes(
      editor,
      {
        highlight: {
          ruleId:     match.ruleId,
          matchId:    match.id,
          severity:   match.severity,
          suggestion: match.suggestion,
          explanation: match.explanation,
          color:
            match.severity === 'error'
              ? 'red'
              : match.severity === 'warning'
              ? 'orange'
              : 'blue',
        },
      },
      {
        at: range,
        match: Text.isText,
        split: true,
      }
    );
  });
}

const Editor = React.memo(({ defaultValue = defaultEditorValue, placeholder = 'Start writing...', readOnly = false, onChange }: EditorProps) => {
  const [value, setValue] = useState<Descendant[]>(defaultValue);
  const { analyzeText, isLoading, results, error } = useAnalysis();

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
    if (results && results.length > 0) {
      console.log('[Editor] Applying highlights for', results.length, 'matches');
      
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
    }
  }, [results, editor]);

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
          }}
        />
      </Slate>

      <style jsx>{`
        .editor-container {
          position: relative;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 16px;
          min-height: 300px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.6;
          font-size: 16px;
          color: #333;
          background-color: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .editor-container :global(.slate-editable) {
          min-height: 250px;
          outline: none;
        }
        .analysis-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .error-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          background-color: rgba(255, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .loading-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
