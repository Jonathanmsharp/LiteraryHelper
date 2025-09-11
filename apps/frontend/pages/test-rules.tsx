import React from 'react';
import { useRuleStore } from '../lib/stores/useRuleStore';

export default function TestRules() {
  const { enabledRules, toggleRule } = useRuleStore();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Rule Store Test</h1>
      <h2>Current Enabled Rules:</h2>
      <ul>
        {enabledRules.map(rule => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      
      <h2>Toggle Rules:</h2>
      {['strong-verbs', 'question-being-having', 'stick-with-said', 'tone-consistency', 'claims-without-evidence', 'inclusive-language'].map(rule => (
        <div key={rule} style={{ margin: '10px 0' }}>
          <label>
            <input
              type="checkbox"
              checked={enabledRules.includes(rule)}
              onChange={() => toggleRule(rule)}
            />
            {rule}
          </label>
        </div>
      ))}
    </div>
  );
}
