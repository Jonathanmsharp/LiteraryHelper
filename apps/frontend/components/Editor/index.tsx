import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createEditor, Descendant, Node, Text, BaseEditor, Editor as SlateEditor, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { useHotkeys } from 'react-hotkeys-hook';
import { create } from 'zustand';

// Define custom element types
type CustomElementType = 'paragraph' | 'heading';

type CustomElement = {
  type: CustomElementType;
  level?: number;
  children: CustomText[];
};

// Define custom text types
type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: {
    color: string;
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
  };
};

// Extend the Slate types
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Define editor store type with enhanced error handling
interface EditorStore {
  text: string;
  analysisInProgress: boolean;
  error: string | null;
  results: Array<{
    ruleId: string;
    ruleName: string;
    matches: Array<{
      ruleId: string;
      range: { start: number; end: number; text: string };
      suggestion?: string;
      explanation?: string;
      severity: 'error' | 'warning' | 'info';
    }>;
    processingTimeMs: number;
  }>;
  demoMode: boolean;
  setText: (text: string) => void;
  setAnalysisInProgress: (inProgress: boolean) => void;
  setResults: (results: any[]) => void;
  setError: (error: string | null) => void;
  setDemoMode: (demoMode: boolean) => void;
}

// Create editor store with Zustand
const useEditorStore = create<EditorStore>((set) => ({
  text: '',
  analysisInProgress: false,
  error: null,
  results: [],
  demoMode: false,
  setText: (text) => set({ text }),
  setAnalysisInProgress: (inProgress) => set({ analysisInProgress: inProgress }),
  setResults: (results) => set({ results }),
  setError: (error) => set({ error }),
  setDemoMode: (demoMode) => set({ demoMode }),
}));

// Define props for the Editor component
interface EditorProps {
  defaultValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

// Default initial value for the editor
const defaultEditorValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  } as CustomElement,
];

// Debounce function implementation
function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

// Element renderer component
const Element = ({ attributes, children, element }: {
  attributes: any;
  children: React.ReactNode;
  element: CustomElement;
}) => {
  switch (element.type) {
    case 'heading':
      return <h2 {...attributes}>{children}</h2>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

// Leaf renderer component
const Leaf = ({ attributes, children, leaf }: {
  attributes: any;
  children: React.ReactNode;
  leaf: CustomText;
}) => {
  let style: React.CSSProperties = {};

  if (leaf.bold) {
    style.fontWeight = 'bold';
  }
  if (leaf.italic) {
    style.fontStyle = 'italic';
  }
  if (leaf.underline) {
    style.textDecoration = 'underline';
  }
  if (leaf.highlight) {
    switch (leaf.highlight.severity) {
      case 'error':
        style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        style.textDecoration = 'underline wavy red';
        break;
      case 'warning':
        style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
        style.textDecoration = 'underline wavy orange';
        break;
      case 'info':
        style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
        style.textDecoration = 'underline dotted blue';
        break;
    }
  }

  return (
    <span {...attributes} style={style}>
      {children}
    </span>
  );
};

// Main Editor component wrapped in React.memo for performance
const Editor = React.memo(({
  defaultValue = defaultEditorValue,
  placeholder = 'Start writing...',
  readOnly = false,
  onChange,
}: EditorProps) => {
  // Initialize the Slate editor with plugins
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Track the editor value state
  const [value, setValue] = useState<Descendant[]>(defaultValue);
  
  // Access the editor store
  const { 
    setText, 
    analysisInProgress, 
    error, 
    results, 
    demoMode,
    setAnalysisInProgress, 
    setResults, 
    setError, 
    setDemoMode 
  } = useEditorStore();

  // Analysis function with better error handling
  const analyzeText = useCallback(
    debounce(async (text: string) => {
      if (!text.trim()) {
        setResults([]);
        setError(null);
        return;
      }

      setAnalysisInProgress(true);
      setError(null);

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Analysis failed');
        }

        setResults(data.results || []);
        
        // Show demo mode notification if applicable
        if (data.demoMode) {
          setDemoMode(true);
          console.log('Running in demo mode');
        } else {
          setDemoMode(false);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMessage);
        setResults([]);
      } finally {
        setAnalysisInProgress(false);
      }
    }, 500),
    [setAnalysisInProgress, setResults, setError, setDemoMode]
  );

  // Create debounced onChange handler (500ms delay)
  const debouncedOnChange = useCallback(
    debounce((value: Descendant[]) => {
      const textContent = value
        .map((node) => Node.string(node))
        .join('\n');
      
      setText(textContent);
      
      // Trigger analysis
      analyzeText(textContent);
      
      if (onChange) {
        onChange(textContent);
      }
    }, 500),
    [onChange, setText, analyzeText]
  );

  // Apply highlights to editor based on analysis results
  useEffect(() => {
    if (!results.length) return;

        // Clear existing highlights
    const clearHighlights = (nodes: Descendant[]): Descendant[] => {
      return nodes.map(node => {
        if (Text.isText(node)) {
          const { highlight, ...rest } = node;
          return rest as Descendant;
        } else {
          return {
            ...node,
            children: clearHighlights(node.children as Descendant[]) as Descendant[],
          } as Descendant;
        }
      });
    };
        }
      });
    };

        // Apply new highlights
    const applyHighlights = (nodes: Descendant[], textOffset: number = 0): Descendant[] => {
      return nodes.map(node => {
        if (Text.isText(node)) {
          const text = node.text;
          const newText: CustomText[] = [];
          let currentOffset = 0;

          // Find all matches that overlap with this text node
          const relevantMatches = results.flatMap(result => 
            result.matches.filter(match => 
              match.range.start >= textOffset && 
              match.range.end <= textOffset + text.length
            )
          );

          // Sort matches by start position
          relevantMatches.sort((a, b) => a.range.start - b.range.start);

          relevantMatches.forEach(match => {
            const matchStart = match.range.start - textOffset;
            const matchEnd = match.range.end - textOffset;

            // Add text before match
            if (currentOffset < matchStart) {
              newText.push({
                text: text.slice(currentOffset, matchStart),
                ...node
              });
            }

            // Add highlighted match
            newText.push({
              text: text.slice(matchStart, matchEnd),
              ...node,
              highlight: {
                color: match.severity === 'error' ? 'red' : 
                       match.severity === 'warning' ? 'orange' : 'blue',
                ruleId: match.ruleId,
                severity: match.severity
              }
            });

            currentOffset = matchEnd;
          });

          // Add remaining text
          if (currentOffset < text.length) {
            newText.push({
              text: text.slice(currentOffset),
              ...node
            });
          }

          return newText.length > 1 ? newText as Descendant[] : newText[0] as Descendant || node;
        } else {
          return {
            ...node,
            children: applyHighlights(node.children, textOffset) as Descendant[],
          } as Descendant;
        }
      });
    };
        }
      });
    };

    const newValue = applyHighlights(clearHighlights(value));
    setValue(newValue);
  }, [results, value, setValue]);

  // Define hotkey handlers
  useHotkeys('mod+b', (event) => {
    event.preventDefault();
    const marks = SlateEditor.marks(editor) || {};
    const isBold = marks.bold === true;
    if (isBold) {
      editor.removeMark('bold');
    } else {
      editor.addMark('bold', true);
    }
  });

  useHotkeys('mod+i', (event) => {
    event.preventDefault();
    const marks = SlateEditor.marks(editor) || {};
    const isItalic = marks.italic === true;
    if (isItalic) {
      editor.removeMark('italic');
    } else {
      editor.addMark('italic', true);
    }
  });

  useHotkeys('mod+u', (event) => {
    event.preventDefault();
    const marks = SlateEditor.marks(editor) || {};
    const isUnderline = marks.underline === true;
    if (isUnderline) {
      editor.removeMark('underline');
    } else {
      editor.addMark('underline', true);
    }
  });

  return (
    <div className="editor-container">
      {demoMode && (
        <div className="demo-mode-banner">
          <span className="demo-icon">🎯</span>
          Demo Mode - Try the writing analysis tool
        </div>
      )}
      
      {analysisInProgress && (
        <div className="analysis-indicator">
          <span className="loading-spinner"></span>
          Analyzing your text...
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <strong>Analysis Error:</strong> {error}
          {error.includes('401') && (
            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()} 
                className="retry-button"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
      
      <Slate
        editor={editor}
        initialValue={value}
        onChange={(newValue) => {
          setValue(newValue);
          debouncedOnChange(newValue);
        }}
      >
        <Editable
          placeholder={placeholder}
          readOnly={readOnly}
          renderElement={(props) => <Element {...props} />}
          renderLeaf={(props) => <Leaf {...props} />}
          spellCheck
          autoFocus
          className="editor-editable"
        />
      </Slate>
      
      {results.length > 0 && (
        <div className="analysis-results">
          <h3>Writing Suggestions ({results.length} issues found)</h3>
          {results.map((result, index) => (
            <div key={index} className="rule-result">
              <div className="rule-header">
                <span className={`rule-severity ${result.matches[0]?.severity || 'info'}`}>
                  {result.matches[0]?.severity || 'info'}
                </span>
                <span className="rule-name">{result.ruleName}</span>
                <span className="rule-time">{result.processingTimeMs}ms</span>
              </div>
              {result.matches.map((match, matchIndex) => (
                <div key={matchIndex} className="match-item">
                  <div className="match-text">"{match.range.text}"</div>
                  {match.suggestion && (
                    <div className="match-suggestion">
                      <strong>Suggestion:</strong> {match.suggestion}
                    </div>
                  )}
                  {match.explanation && (
                    <div className="match-explanation">
                      <strong>Why:</strong> {match.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
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
        
        .demo-mode-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .demo-icon {
          font-size: 16px;
        }
        
        .editor-editable {
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
        
        .loading-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        
        .error-message {
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 12px;
          color: #dc2626;
        }
        
        .error-actions {
          margin-top: 8px;
        }
        
        .retry-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .retry-button:hover {
          background-color: #2563eb;
        }
        
        .analysis-results {
          margin-top: 16px;
          padding: 16px;
          background-color: #f8fafc;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        
        .analysis-results h3 {
          margin: 0 0 12px 0;
          color: #1e293b;
          font-size: 16px;
        }
        
        .rule-result {
          margin-bottom: 16px;
          padding: 12px;
          background-color: white;
          border-radius: 4px;
          border-left: 4px solid #e2e8f0;
        }
        
        .rule-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .rule-severity {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .rule-severity.error {
          background-color: #fee2e2;
          color: #dc2626;
        }
        
        .rule-severity.warning {
          background-color: #fef3c7;
          color: #d97706;
        }
        
        .rule-severity.info {
          background-color: #dbeafe;
          color: #2563eb;
        }
        
        .rule-name {
          font-weight: 600;
          color: #1e293b;
        }
        
        .rule-time {
          margin-left: auto;
          font-size: 12px;
          color: #64748b;
        }
        
        .match-item {
          margin-bottom: 8px;
        }
        
        .match-text {
          font-family: 'Courier New', monospace;
          background-color: #f1f5f9;
          padding: 4px 6px;
          border-radius: 3px;
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .match-suggestion,
        .match-explanation {
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .match-suggestion strong,
        .match-explanation strong {
          color: #374151;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;