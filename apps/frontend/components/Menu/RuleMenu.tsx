import React, { useState, useEffect } from 'react';
import { useRuleStore } from '../../lib/stores/useRuleStore';

interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'ai';
  severity: 'error' | 'warning' | 'info';
}

// Hardcoded rules as fallback
const FALLBACK_RULES: Rule[] = [
  {
    id: 'strong-verbs',
    name: 'Use Strong Verbs',
    description: 'Replace weak, imprecise verbs with strong verbs that are more specific.',
    type: 'simple',
    severity: 'info'
  },
  {
    id: 'question-being-having',
    name: 'Question Being and Having',
    description: 'Look for isolated forms of "to be" and "to have". These are the weakest of all verbs.',
    type: 'simple',
    severity: 'warning'
  },
  {
    id: 'stick-with-said',
    name: 'Stick with Said',
    description: 'Look for non-said attributions. Newspapers use "he said," "she said," or "they said," over and over.',
    type: 'simple',
    severity: 'info'
  },
  {
    id: 'tone-consistency',
    name: 'Tone Consistency',
    description: 'Ensure tone stays formal‑friendly throughout.',
    type: 'ai',
    severity: 'warning'
  },
  {
    id: 'claims-without-evidence',
    name: 'Claims Without Evidence',
    description: 'Find factual claims lacking citations or data.',
    type: 'ai',
    severity: 'error'
  },
  {
    id: 'inclusive-language',
    name: 'Inclusive Language',
    description: 'Flag non‑inclusive or biased terms and suggest alternatives.',
    type: 'ai',
    severity: 'warning'
  }
];

const RuleMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>(FALLBACK_RULES);
  const { enabledRules, toggleRule } = useRuleStore();

  const handleToggleRule = (ruleId: string) => {
    console.log('[RuleMenu] Toggle clicked for rule:', ruleId);
    console.log('[RuleMenu] Current enabled rules before toggle:', enabledRules);
    toggleRule(ruleId);
    console.log('[RuleMenu] Toggle called for rule:', ruleId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'ai' ? '🤖' : '⚡';
  };

  console.log('[RuleMenu] Current enabled rules:', enabledRules);

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle rules menu"
      >
        <div className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="menu-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Panel */}
      <div className={`menu-panel ${isOpen ? 'open' : ''}`}>
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
          {rules.map((rule) => (
            <div key={rule.id} className="rule-item">
              <div className="rule-header">
                <div className="rule-info">
                  <div className="rule-title">
                    <span className="rule-icon">{getTypeIcon(rule.type)}</span>
                    <span className="rule-name">{rule.name}</span>
                    <span 
                      className="severity-indicator"
                      style={{ backgroundColor: getSeverityColor(rule.severity) }}
                    />
                  </div>
                  <p className="rule-description">{rule.description}</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={enabledRules.includes(rule.id)}
                    onChange={() => handleToggleRule(rule.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .hamburger-button {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1001;
          background: #4a7c7e;
          border: none;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(74, 124, 126, 0.3);
          transition: all 0.3s ease;
        }

        .hamburger-button:hover {
          background: #3a6a6c;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(74, 124, 126, 0.4);
        }

        .hamburger-icon {
          width: 24px;
          height: 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hamburger-icon span {
          display: block;
          height: 3px;
          width: 100%;
          background: white;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .hamburger-icon.open span:nth-child(1) {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .hamburger-icon.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger-icon.open span:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        .menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          backdrop-filter: blur(4px);
        }

        .menu-panel {
          position: fixed;
          top: 0;
          left: 0;
          width: 400px;
          height: 100vh;
          background: #fdfcfb;
          z-index: 1000;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
        }

        .menu-panel.open {
          transform: translateX(0);
        }

        .menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #4a7c7e;
          color: white;
          min-height: 60px;
        }

        .menu-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          flex: 1;
          text-align: center;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-content {
          padding: 20px;
        }

        .rule-item {
          margin-bottom: 20px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .rule-info {
          flex: 1;
        }

        .rule-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .rule-icon {
          font-size: 16px;
        }

        .rule-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }

        .severity-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .rule-description {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
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
          background-color: #d1d5db;
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
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #4a7c7e;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        @media (max-width: 480px) {
          .menu-panel {
            width: 100vw;
          }
          
          .hamburger-button {
            top: 15px;
            left: 15px;
            padding: 10px;
          }
        }
      `}</style>
    </>
  );
};

export default RuleMenu;
