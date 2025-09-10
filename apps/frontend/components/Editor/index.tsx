import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

interface EditorProps {
  defaultValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (text: string) => void;
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
      {results && results.length > 0 && (
        <div className="analysis-results">
          <h4>Analysis Results ({results.length} matches found):</h4>
          <ul>
            {results.map((match, index) => (
              <li key={index} style={{ 
                padding: '5px', 
                margin: '2px 0', 
                backgroundColor: match.severity === 'error' ? '#FEE2E2' : 
                                match.severity === 'warning' ? '#FEF3C7' : '#DBEAFE',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              onClick={() => {
                const { openSidebar } = useSidebarStore.getState();
                openSidebar({
                  id: `${match.ruleId}-${index}`,
                  ruleId: match.ruleId,
                  range: match.range,
                  severity: match.severity,
                  suggestion: match.suggestion,
                  explanation: match.explanation,
                });
              }}>
                <strong>{match.ruleId}</strong>: "{match.range.text}" 
                <span style={{ fontSize: '0.9em', color: '#666' }}>
                  ({match.severity})
                </span>
              </li>
            ))}
          </ul>
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
        
        .analysis-results {
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
        }
        
        .analysis-results h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #495057;
        }
        
        .analysis-results ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        
        .analysis-results li {
          font-size: 14px;
          line-height: 1.4;
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
