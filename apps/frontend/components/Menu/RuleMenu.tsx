import React, { useState, useEffect } from 'react';
import { useRuleStore } from '../../lib/stores/useRuleStore';

// Fallback rules data
const FALLBACK_RULES = [
  {
    id: 'strong-verbs',
    name: 'Use Strong Verbs',
    description: 'Neal: Replace weak, imprecise verbs (walked, stood) with strong verbs that are more specific (trudged, malingered). Strong verbs enliven, reduce the need for adjectives and adverbs, and trigger new sentence structures. Annie: A strong verb instantly improves your sentence. Use your online thesaurus.',
    type: 'writing',
    severity: 'warning'
  },
  {
    id: 'question-being-having',
    name: 'Question Being and Having',
    description: 'Neal: "To be" and "to have" are the weakest of all verbs. Static, they slow a narrative. Annie: Question each use of "being" and "having." Can you do better? Maybe replace it with a verb that adds to the sentence?',
    type: 'writing',
    severity: 'warning'
  },
  {
    id: 'stick-with-said',
    name: 'Stick with Said',
    description: 'Neal: Newspapers use the phrase "he said," "she said," or "they said," over and over. You can too. Anything else adds opinion to what is mostly a marker to show who is talking. Annie: Be careful when using another verb for attribution. Many sound hokey. Never use "chuckled," for instance. But at times another verb is perfectly fine. Some safe ones are "stated," "announced," whispered," and "remarked."',
    type: 'writing',
    severity: 'warning'
  },
  {
    id: 'tone-consistency',
    name: 'Tone Consistency',
    description: 'Ensure tone stays formal-friendly throughout.',
    type: 'ai',
    severity: 'warning'
  },
  {
    id: 'claims-without-evidence',
    name: 'Claims Without Evidence',
    description: 'Find factual claims lacking citations or data.',
    type: 'ai',
    severity: 'warning'
  },
  {
    id: 'inclusive-language',
    name: 'Inclusive Language',
    description: 'Flag non-inclusive or biased terms and suggest alternatives.',
    type: 'ai',
    severity: 'warning'
  },
  {
    id: 'literary-language',
    name: 'If It Sounds Literary, It Isn\'t',
    description: 'Keep your language conversational and use modern, casual speech patterns even with serious non-fiction subjects. You want to build a relationship with your reader. Don\'t be stuffy or superior.',
    type: 'ai',
    severity: 'warning'
  }
];

const RuleMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rules, setRules] = useState(FALLBACK_RULES);
  const { enabledRules, toggleRule, isRuleEnabled } = useRuleStore();

  useEffect(() => {
    // Try to load rules from config, fallback to hardcoded rules
    const loadRules = async () => {
      try {
        const response = await fetch('/config/rules.json');
        if (response.ok) {
          const rulesData = await response.json();
          setRules(rulesData);
        } else {
          // Use fallback rules if config fails
          setRules(FALLBACK_RULES);
        }
      } catch (error) {
        console.error('Failed to load rules:', error);
        // Use fallback rules on error
        setRules(FALLBACK_RULES);
      }
    };

    loadRules();
  }, []);

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'writing':
        return '⚡';
      case 'ai':
        return '��';
      default:
        return '📝';
    }
  };

  const handleToggle = (ruleId: string) => {
    toggleRule(ruleId);
  };

  return (
    <>
      <button
        className="hamburger-menu"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle rules menu"
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && (
        <div className="menu-overlay" onClick={() => setIsOpen(false)}>
          <div className="menu-container" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Writing Rules</h3>
              <button 
                className="close-button" 
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            
            <div className="menu-content">
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div key={rule.id} className="rule-item">
                    <div className="rule-info">
                      <div className="rule-header">
                        <span className="rule-icon">{getRuleIcon(rule.type)}</span>
                        <span className="rule-name">{rule.name}</span>
                      </div>
                      <p className="rule-description">{rule.description}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isRuleEnabled(rule.id)}
                        onChange={() => handleToggle(rule.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))
              ) : (
                <p>No rules available</p>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hamburger-menu {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1001;
          background: #4a7c7e;
          border: none;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .hamburger-menu:hover {
          background: #5a8a8c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .hamburger-icon {
          display: flex;
          flex-direction: column;
          gap: 3px;
          width: 20px;
          height: 16px;
        }

        .hamburger-icon span {
          width: 100%;
          height: 2px;
          background: white;
          border-radius: 1px;
          transition: all 0.3s ease;
        }

        .menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 20px;
        }

        .menu-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .menu-header {
          background: linear-gradient(135deg, #4a7c7e 0%, #5a8a8c 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e0e0e0;
        }

        .menu-header h3 {
          margin: 0;
          font-size: 1.3em;
          font-weight: 600;
          font-family: 'Georgia', serif;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 1.8em;
          cursor: pointer;
          padding: 5px;
          line-height: 1;
          border-radius: 3px;
          transition: background-color 0.2s ease;
        }

        .close-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .menu-content {
          padding: 20px;
          overflow-y: auto;
          flex-grow: 1;
        }

        .rule-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 15px 0;
          border-bottom: 1px solid #f0f0f0;
          gap: 15px;
        }

        .rule-item:last-child {
          border-bottom: none;
        }

        .rule-info {
          flex-grow: 1;
        }

        .rule-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .rule-icon {
          font-size: 1.2em;
          flex-shrink: 0;
        }

        .rule-name {
          font-weight: 600;
          color: #333;
          font-size: 1.1em;
        }

        .rule-description {
          margin: 0;
          color: #666;
          font-size: 0.9em;
          line-height: 1.4;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #4a7c7e;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .toggle-slider:hover {
          box-shadow: 0 0 8px rgba(74, 124, 126, 0.3);
        }
      `}</style>
    </>
  );
};

export default RuleMenu;
