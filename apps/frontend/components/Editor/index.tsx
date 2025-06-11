import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createEditor, Descendant, Editor as SlateEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useHotkeys } from 'react-hotkeys-hook';
import { create } from 'zustand';

// Define custom element types
type ParagraphElement = {
  type: 'paragraph';
  children: Descendant[];
};

type HeadingElement = {
  type: 'heading';
  level: number;
  children: Descendant[];
};

type CustomElement = ParagraphElement | HeadingElement;

// Define custom leaf types for text formatting
type FormattedText = {
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

// Define editor store type
interface EditorStore {
  text: string;
  analysisInProgress: boolean;
  results: Array<{
    ruleId: string;
    matches: Array<{
      start: number;
      end: number;
      text: string;
      suggestion?: string;
    }>;
  }>;
  setText: (text: string) => void;
  setAnalysisInProgress: (inProgress: boolean) => void;
  setResults: (results: any[]) => void;
}

// Create editor store with Zustand
const useEditorStore = create<EditorStore>((set) => ({
  text: '',
  analysisInProgress: false,
  results: [],
  setText: (text) => set({ text }),
  setAnalysisInProgress: (inProgress) => set({ analysisInProgress: inProgress }),
  setResults: (results) => set({ results }),
}));

// Define props for the Editor component
interface EditorProps {
  initialValue?: Descendant[];
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

// Default initial value for the editor
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
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
const Element = ({ attributes, children, element }: any) => {
  switch (element.type) {
    case 'heading':
      return <h2 {...attributes}>{children}</h2>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

// Leaf renderer component
const Leaf = ({ attributes, children, leaf }: any) => {
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
  initialValue = initialValue,
  placeholder = 'Start writing...',
  readOnly = false,
  onChange,
}: EditorProps) => {
  // Initialize the Slate editor with plugins
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Track the editor value state
  const [value, setValue] = useState<Descendant[]>(initialValue);
  
  // Access the editor store
  const { setText, analysisInProgress } = useEditorStore();

  // Create debounced onChange handler (500ms delay)
  const debouncedOnChange = useCallback(
    debounce((value: Descendant[]) => {
      const textContent = value
        .map((node) => SlateEditor.string(editor, node))
        .join('\n');
      
      setText(textContent);
      
      if (onChange) {
        onChange(textContent);
      }
    }, 500),
    [editor, onChange, setText]
  );

  // Define hotkey handlers
  useHotkeys('mod+b', (event) => {
    event.preventDefault();
    const isBold = SlateEditor.marks(editor)?.bold === true;
    if (isBold) {
      editor.removeMark('bold');
    } else {
      editor.addMark('bold', true);
    }
  });

  useHotkeys('mod+i', (event) => {
    event.preventDefault();
    const isItalic = SlateEditor.marks(editor)?.italic === true;
    if (isItalic) {
      editor.removeMark('italic');
    } else {
      editor.addMark('italic', true);
    }
  });

  useHotkeys('mod+u', (event) => {
    event.preventDefault();
    const isUnderline = SlateEditor.marks(editor)?.underline === true;
    if (isUnderline) {
      editor.removeMark('underline');
    } else {
      editor.addMark('underline', true);
    }
  });

  return (
    <div className="editor-container">
      {analysisInProgress && (
        <div className="analysis-indicator">
          <span className="loading-spinner"></span>
          Analyzing your text...
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
          placeholder={placeholder}
          readOnly={readOnly}
          renderElement={(props) => <Element {...props} />}
          renderLeaf={(props) => <Leaf {...props} />}
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
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
