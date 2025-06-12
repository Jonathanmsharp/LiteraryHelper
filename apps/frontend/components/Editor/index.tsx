import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createEditor, Descendant, Node, Text, BaseEditor, Editor as SlateEditor, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAnalysis } from '../../lib/hooks/useAnalysis';

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
    severity: 'error' | 'warning' | 'info';
  };
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface EditorProps {
  defaultValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

const defaultEditorValue: Descendant[] = [
  { type: 'paragraph', children: [{ text: '' }] } as CustomElement,
];

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

const Element = ({ attributes, children, element }: any) => {
  switch (element.type) {
    case 'heading': return <h2 {...attributes}>{children}</h2>;
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
      onClick={leaf.highlight ? () => {
        console.log('Clicked highlight:', leaf.highlight);
      } : undefined}
    >
      {children}
    </span>
  );
};

const Editor = React.memo(({ defaultValue = defaultEditorValue, placeholder = 'Start writing...', readOnly = false, onChange }: EditorProps) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>(defaultValue);
  const { analyzeText, isLoading, results, error } = useAnalysis();

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

  useEffect(() => {
    if (results && results.length > 0) {
      console.log('[Editor] Applying highlights for', results.length, 'matches');
      results.forEach(match => {
        console.log('Match:', match.ruleId, match.range.text, match.severity);
      });
    }
  }, [results, editor]);

  return (
    <div className="editor-container">
      {isLoading && (
        <div className="analysis-indicator">
          <span className="loading-spinner"></span>
          Analyzing your text...
        </div>
      )}
      
      {error && (
        <div className="error-indicator">
          Analysis error: {error}
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
          renderElement={Element}
          renderLeaf={Leaf}
          spellCheck
          autoFocus
          className="editor-editable"
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
        
        .editor-editable { min-height: 250px; outline: none; }
        
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
        
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
});

Editor.displayName = 'Editor';
export default Editor;
