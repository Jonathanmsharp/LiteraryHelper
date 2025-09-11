import React from 'react';
import { create } from 'zustand';

type RuleMatch = {
  id?: string;
  ruleId: string;
  range: { start: number; end: number; text: string; };
  suggestion?: string;
  explanation?: string;
  severity: 'error' | 'warning' | 'info';
};

interface SidebarState {
  isOpen: boolean;
  selectedMatch: RuleMatch | null;
  openSidebar: (match: RuleMatch) => void;
  closeSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  selectedMatch: null,
  openSidebar: (match) => set({ isOpen: true, selectedMatch: match }),
  closeSidebar: () => set({ isOpen: false, selectedMatch: null }),
}));

// Rule database with detailed information and examples
const RULE_DATABASE = {
  'strong-verbs': {
    name: 'Use Strong Verbs',
    description: 'Replace weak verbs with more descriptive, powerful ones',
    examples: [
      { incorrect: 'She walked to the store.', correct: 'She sprinted to the store.' },
      { incorrect: 'He stood in the doorway.', correct: 'He loomed in the doorway.' },
      { incorrect: 'The dog ran fast down the street.', correct: 'The dog dashed down the street.' }
    ],
    tips: 'Strong verbs enliven your writing, reduce the need for adjectives and adverbs, and trigger new sentence structures. Use your online thesaurus to find more powerful alternatives.'
  },
  'question-being-having': {
    name: 'Question Being and Having',
    description: 'Replace forms of "to be" and "to have" with more active, engaging verbs',
    examples: [
      { incorrect: 'I am tired.', correct: 'Fatigue set in.' },
      { incorrect: 'She is a talented artist.', correct: 'She shines as a talented artist.' },
      { incorrect: 'He has a lot of experience.', correct: 'He brings a wealth of experience.' },
      { incorrect: 'They are in a difficult situation.', correct: 'They face a difficult situation.' },
      { incorrect: 'She is happy.', correct: 'Joy radiates from her.' }
    ],
    tips: '"To be" and "to have" are the weakest of all verbs. Static, they slow a narrative. Question each use of "being" and "having." Can you do better?'
  },
  'stick-with-said': {
    name: 'Stick with "Said"',
    description: 'Use "said" instead of fancy alternatives in dialogue attribution',
    examples: [
      { incorrect: '"I\'m not sure about that," she chuckled.', correct: '"I\'m not sure about that," she said.' },
      { incorrect: '"That\'s a great idea," he smiled.', correct: '"That\'s a great idea," he said.' },
      { incorrect: '"I don\'t think so," she explained.', correct: '"I don\'t think so," she said.' },
      { incorrect: '"This is what I meant," he remarked.', correct: '"This is what I meant," he said.' },
      { incorrect: '"Let\'s go!" she shouted.', correct: '"Let\'s go!" she said.' }
    ],
    tips: 'Newspapers use "he said," "she said," or "they said," over and over. You can too. Anything else adds opinion to what is mostly a marker to show who is talking.'
  },
  'tone-consistency': {
    name: 'Tone Consistency',
    description: 'Ensure tone stays formal-friendly throughout',
    examples: [
      { incorrect: 'This is totally awesome!', correct: 'This is excellent.' },
      { incorrect: 'The results are kinda good.', correct: 'The results are satisfactory.' },
      { incorrect: 'That\'s really bad.', correct: 'That\'s concerning.' }
    ],
    tips: 'Maintain a consistent, professional tone throughout your writing. Avoid mixing casual and formal language.'
  },
  'claims-without-evidence': {
    name: 'Claims Without Evidence',
    description: 'Find factual claims lacking citations or data',
    examples: [
      { incorrect: 'Most people agree that...', correct: 'According to a 2023 study, 78% of respondents agree that...' },
      { incorrect: 'This is the best solution.', correct: 'This solution has shown 40% improvement in efficiency.' }
    ],
    tips: 'Support your claims with specific data, statistics, or citations to strengthen your argument.'
  },
  'inclusive-language': {
    name: 'Inclusive Language',
    description: 'Flag non-inclusive or biased terms and suggest alternatives',
    examples: [
      { incorrect: 'The chairman will speak.', correct: 'The chairperson will speak.' },
      { incorrect: 'All mankind should...', correct: 'All people should...' },
      { incorrect: 'The disabled person...', correct: 'The person with a disability...' }
    ],
    tips: 'Use language that includes all people and avoids assumptions about gender, ability, or background.'
  }
};

const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
  switch (severity) {
    case 'error': return '#EF4444';
    case 'warning': return '#F59E0B';
    case 'info': return '#3B82F6';
    default: return '#6B7280';
  }
};

const RuleSidebar: React.FC = () => {
  const { isOpen, selectedMatch, closeSidebar } = useSidebarStore();

  if (!isOpen || !selectedMatch) {
    return null;
  }

  const { ruleId, range, suggestion, explanation, severity } = selectedMatch;
  const severityColor = getSeverityColor(severity);
  const ruleInfo = RULE_DATABASE[ruleId as keyof typeof RULE_DATABASE];

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    closeSidebar();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="sidebar-backdrop" 
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
        }}
      />
      
      {/* Sidebar */}
      <div className="sidebar-container">
        <div className="sidebar-header">
          <h3>{ruleInfo?.name || 'Rule Details'}</h3>
          <button onClick={handleClose} className="close-button">×</button>
        </div>
        <div className="sidebar-content">
          {ruleInfo && (
            <>
              <div className="rule-description">
                <p>{ruleInfo.description}</p>
              </div>
              
              <div className="section">
                <h4>Examples</h4>
                <div className="examples-list">
                  {ruleInfo.examples.map((example, index) => (
                    <div key={index} className="example-pair">
                      <div className="example incorrect">
                        <span className="example-marker">❌</span>
                        <span className="example-text">{example.incorrect}</span>
                      </div>
                      <div className="example correct">
                        <span className="example-marker">✅</span>
                        <span className="example-text">{example.correct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section">
                <h4>Writing Tip</h4>
                <p className="tip-text">{ruleInfo.tips}</p>
              </div>
            </>
          )}

          <div className="section">
            <h4>Your Text</h4>
            <p className="affected-text">
              <strong>Highlighted:</strong> "<span style={{ backgroundColor: severityColor + '33', padding: '2px 4px', borderRadius: '3px' }}>{range.text}</span>"
            </p>
            <p className="severity" style={{ color: severityColor }}>
              <strong>Severity:</strong> {severity.toUpperCase()}
            </p>
            {suggestion && (
              <p className="suggestion">
                <strong>Suggestion:</strong> {suggestion}
              </p>
            )}
          </div>
        </div>

        <style jsx>{`
          .sidebar-container {
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100%;
            background-color: #fdfcfb;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            z-index: 1000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #333;
          }
          .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 2px solid #4a7c7e;
            background: linear-gradient(135deg, #4a7c7e 0%, #5a8a8c 100%);
            color: white;
          }
          .sidebar-header h3 {
            margin: 0;
            font-size: 1.3em;
            font-weight: 600;
            font-family: 'Georgia', serif;
          }
          .close-button {
            background: none;
            border: none;
            font-size: 1.8em;
            cursor: pointer;
            color: white;
            padding: 5px;
            line-height: 1;
            border-radius: 3px;
            transition: background-color 0.2s ease;
          }
          .close-button:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
          .sidebar-content {
            padding: 25px;
            overflow-y: auto;
            flex-grow: 1;
          }
          .rule-description {
            margin-bottom: 25px;
            padding: 15px;
            background: linear-gradient(135deg, #e0f7fa 0%, #f0fdf4 100%);
            border-radius: 8px;
            border-left: 4px solid #4a7c7e;
          }
          .rule-description p {
            margin: 0;
            font-size: 1.1em;
            font-weight: 500;
            color: #2d5a5c;
            line-height: 1.5;
          }
          .section {
            margin-bottom: 25px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }
          .section h4 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.1em;
            font-weight: 600;
            color: #4a7c7e;
            font-family: 'Georgia', serif;
          }
          .examples-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .example-pair {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .example {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px;
            border-radius: 6px;
            font-family: 'Georgia', serif;
            font-size: 0.95em;
            line-height: 1.4;
          }
          .example.incorrect {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
          }
          .example.correct {
            background: #f0fdf4;
            border-left: 3px solid #22c55e;
          }
          .example-marker {
            font-size: 1.1em;
            flex-shrink: 0;
            margin-top: 1px;
          }
          .example-text {
            flex: 1;
          }
          .tip-text {
            font-style: italic;
            color: #555;
            line-height: 1.6;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #4a7c7e;
          }
          .affected-text {
            margin-bottom: 15px;
            padding: 12px;
            background-color: #f0f0f0;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            font-family: 'Georgia', serif;
          }
          .severity, .suggestion {
            margin-bottom: 10px;
            font-size: 0.95em;
          }
          .severity {
            font-weight: 500;
          }
          .suggestion {
            color: #555;
          }
        `}</style>
      </div>
    </>
  );
};

export default RuleSidebar;
