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
    description: 'Neal: Replace weak, imprecise verbs (walked, stood) with strong verbs that are more specific (trudged, malingered). Strong verbs enliven, reduce the need for adjectives and adverbs, and trigger new sentence structures.\n\nAnnie: A strong verb instantly improves your sentence. Use your online thesaurus.',
    type: 'simple',
    severity: 'info'
  },
  {
    id: 'question-being-having',
    name: 'Question Being and Having',
    description: 'Neal: "To be" and "to have" are the weakest of all verbs. Static, they slow a narrative.\n\nAnnie: Question each use of "being" and "having." Can you do better? Maybe replace it with a verb that adds to the sentence?',
    type: 'simple',
    severity: 'warning'
  },
  {
    id: 'stick-with-said',
    name: 'Stick with Said',
    description: 'Neal: Newspapers use the phrase "he said," "she said," or "they said," over and over. You can too. Anything else adds opinion to what is mostly a marker to show who is talking.\n\nAnnie: Be careful when using another verb for attribution. Many sound hokey. Never use "chuckled," for instance. But at times another verb is perfectly fine. Some safe ones are "stated," "announced," whispered," and "remarked."',
    type: 'simple',
    severity: 'info'
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
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-lg shadow-lg transition-colors duration-200"
        aria-label="Toggle rules menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Writing Rules</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-lg">{getTypeIcon(rule.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {rule.name}
                      </h4>
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getSeverityColor(rule.severity)}20`,
                          color: getSeverityColor(rule.severity)
                        }}
                      >
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">
                      {rule.description}
                    </p>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledRules.includes(rule.id)}
                        onChange={() => handleToggleRule(rule.id)}
                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">
                        {enabledRules.includes(rule.id) ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Toggle rules on/off to customize your writing analysis
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RuleMenu;
