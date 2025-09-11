import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createEditor, Descendant, Node, Text, Range, Path, BaseEditor, NodeEntry, Editor as SlateEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useAnalysis } from '../../lib/hooks/useAnalysis';
import { useSidebarStore } from '../Sidebar/RuleSidebar';
import { useRuleStore } from '../../lib/stores/useRuleStore';

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

// Extend Slate's CustomTypes to include our custom text properties
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
    children: [{ text: 'Type your text here to get real-time writing suggestions...' }],
  },
];

// Element renderer
const Element = ({ attributes, children, element }: any) => {
  switch (element.type) {
    default:
      return <p {...attributes}>{children}</p>;
  }
};

// Leaf renderer for highlighting
const Leaf = React.memo(({ attributes, children, leaf }: any) => {
  const openSidebar = useSidebarStore((state) => state.openSidebar);
  const style: React.CSSProperties = {};

  if (leaf.highlight) {
    switch (leaf.highlight.type) {
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
});

Leaf.displayName = 'Leaf';

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
  const { enabledRules } = useRuleStore();

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
    console.log('[Editor] Using enabled rules:', enabledRules);
    setHasAnalyzed(true);
    analyzeText(textContent, enabledRules);
  }, [value, analyzeText, enabledRules]); // Fixed: Added enabledRules to dependencies

  // Decoration function for highlighting
  const decorate = useCallback(([node, path]: NodeEntry): Range[] => {
    const ranges: HighlightDecoration[] = [];
    
    if (!results || results.length === 0 || !hasAnalyzed || !Text.isText(node)) {
      return ranges;
    }

    const nodeText = Node.string(node);
    const nodeStartOffset = SlateEditor.start(editor, path).offset;

    console.log('[decorate] Processing node at path', path, 'with text:', nodeText.substring(0, 20) + '...');
    console.log('[decorate] Node range:', nodeStartOffset, '-', nodeStartOffset + nodeText.length);

    results.forEach((match, index) => {
      // Only apply decoration if the rule is enabled
      if (!enabledRules.includes(match.ruleId)) {
        console.log('[decorate] Skipping match for disabled rule:', match.ruleId);
        return;
      }

      const matchStart = match.range.start;
      const matchEnd = match.range.end;

      // Check if the match overlaps with the current text node
      if (matchStart < nodeStartOffset + nodeText.length && matchEnd > nodeStartOffset) {
        // Calculate the intersection of the match and the current node
        const highlightStart = Math.max(matchStart, nodeStartOffset);
        const highlightEnd = Math.min(matchEnd, nodeStartOffset + nodeText.length);

        // Convert absolute offsets to relative offsets within the current node
        const relativeStart = highlightStart - nodeStartOffset;
        const relativeEnd = highlightEnd - nodeStartOffset;

        if (relativeStart < relativeEnd) {
          console.log('[decorate] Checking match:', match.range.text, 'at', matchStart, '-', matchEnd);
          console.log('[decorate] Adding highlight for:', match.range.text, 'at relative offset', relativeStart, '-', relativeEnd);
          
          // Generate a unique match ID using ruleId and index
          const matchId = `${match.ruleId}-${index}`;
          
          ranges.push({
            anchor: { path, offset: relativeStart },
            focus: { path, offset: relativeEnd },
            highlight: {
              type: match.severity,
              ruleId: match.ruleId,
              matchId: matchId,
              suggestion: match.suggestion || 'Consider revising this text.',
              explanation: match.explanation || 'This text matches a writing rule.',
              matchText: match.range.text,
            }
          });
        }
      }
    });

    console.log('[decorate] Generated', ranges.length, 'decorations for node');
    return ranges;
  }, [editor, results, hasAnalyzed, enabledRules]); // Fixed: Added enabledRules to dependencies

  // Cleanup debounced functions
  useEffect(() => {
    return () => {
      // debouncedOnChange.cancel(); // Removed as debouncedOnChange is no longer directly calling analyze
    };
  }, []);

  const handleTextChange = useCallback((newValue: Descendant[]) => {
    setValue(newValue);
    setHasAnalyzed(false); // Reset analysis status on text change
    const textContent = newValue.map((node) => Node.string(node)).join('\n');
    if (onChange) onChange(textContent);
  }, [onChange]);

  return (
    <div className="editor-container">
      {isLoading && <div className="loading-indicator">Analyzing...</div>}
      {error && <div className="error-message">Error: {error}</div>}
      {results && results.length > 0 && hasAnalyzed && (
        <div className="analysis-summary">Found {results.length} writing suggestions</div>
      )}
      <Slate
        editor={editor}
        initialValue={value}
        onValueChange={handleTextChange}
      >
        <Editable
          renderElement={Element}
          renderLeaf={Leaf}
          decorate={decorate}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{
            minHeight: '250px',
            outline: 'none',
            padding: '15px 20px',
            border: '1px solid #4a7c7e',
            borderRadius: '8px',
            fontFamily: 'Georgia, serif',
            fontSize: '1.1em',
            lineHeight: '1.6',
            backgroundColor: '#fdfcfb',
            color: '#333',
          }}
        />
      </Slate>
      <button onClick={handleAnalyze} disabled={isLoading} className="analyze-button">
        {isLoading ? 'Analyzing...' : 'Analyze Writing'}
      </button>

      <style jsx>{`
        .editor-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin: 30px auto;
          background-color: #fdfcfb;
          border-radius: 10px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
        }
        .loading-indicator, .error-message, .analysis-summary {
          margin-bottom: 15px;
          padding: 10px 15px;
          border-radius: 5px;
          font-size: 0.9em;
          font-family: 'Inter', sans-serif;
        }
        .loading-indicator {
          background-color: #e0f7fa;
          color: #00796b;
        }
        .error-message {
          background-color: #ffebee;
          color: #c62828;
        }
        .analysis-summary {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        .analyze-button {
          background-color: #4a7c7e;
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.05em;
          margin-top: 20px;
          transition: background-color 0.2s ease, transform 0.2s ease;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .analyze-button:disabled {
          background-color: #a0c8f9;
          cursor: not-allowed;
          box-shadow: none;
        }
        .analyze-button:hover:not(:disabled) {
          background-color: #5a8a8c;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
