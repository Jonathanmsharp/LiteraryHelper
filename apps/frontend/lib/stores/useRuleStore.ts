import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RuleStore {
  enabledRules: string[];
  toggleRule: (ruleId: string) => void;
  setEnabledRules: (rules: string[]) => void;
  isRuleEnabled: (ruleId: string) => boolean;
  resetRules: () => void;
}

export const useRuleStore = create<RuleStore>()(
  persist(
    (set, get) => ({
      // Default: all rules enabled
        'strong-verbs',
        'question-being-having', 
        'stick-with-said',
        'literary-language'
      ],
      
      toggleRule: (ruleId: string) => {
        console.log('[RuleStore] Toggling rule:', ruleId);
        set((state) => {
          const isEnabled = state.enabledRules.includes(ruleId);
          console.log('[RuleStore] Rule is currently enabled:', isEnabled);
          console.log('[RuleStore] Current enabled rules:', state.enabledRules);
          
          if (isEnabled) {
            const newRules = state.enabledRules.filter(id => id !== ruleId);
            console.log('[RuleStore] Removing rule, new enabled rules:', newRules);
            return {
              enabledRules: newRules
            };
          } else {
            const newRules = [...state.enabledRules, ruleId];
            console.log('[RuleStore] Adding rule, new enabled rules:', newRules);
            return {
              enabledRules: newRules
            };
          }
        });
      },
      
      setEnabledRules: (rules: string[]) => {
        console.log('[RuleStore] Setting enabled rules:', rules);
        set({ enabledRules: rules });
      },
      
      isRuleEnabled: (ruleId: string) => {
        const enabled = get().enabledRules.includes(ruleId);
        console.log('[RuleStore] Checking if rule is enabled:', ruleId, enabled);
        return enabled;
      },
      
      resetRules: () => {
        console.log('[RuleStore] Resetting rules to default');
        set({
          enabledRules: [
            'strong-verbs',
            'question-being-having', 
          enabledRules: [
            'strong-verbs',
            'question-being-having', 
            'stick-with-said',
            'literary-language'
          ]
    {
      name: 'rule-store', // unique name for localStorage
      version: 2
    }
  )
);
