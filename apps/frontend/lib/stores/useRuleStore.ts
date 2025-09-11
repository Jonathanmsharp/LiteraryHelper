import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RuleStore {
  enabledRules: string[];
  toggleRule: (ruleId: string) => void;
  setEnabledRules: (rules: string[]) => void;
  isRuleEnabled: (ruleId: string) => boolean;
}

export const useRuleStore = create<RuleStore>()(
  persist(
    (set, get) => ({
      // Default: all rules enabled
      enabledRules: [
        'strong-verbs',
        'question-being-having', 
        'stick-with-said',
        'tone-consistency',
        'claims-without-evidence',
        'inclusive-language'
      ],
      
      toggleRule: (ruleId: string) => {
        set((state) => {
          const isEnabled = state.enabledRules.includes(ruleId);
          if (isEnabled) {
            return {
              enabledRules: state.enabledRules.filter(id => id !== ruleId)
            };
          } else {
            return {
              enabledRules: [...state.enabledRules, ruleId]
            };
          }
        });
      },
      
      setEnabledRules: (rules: string[]) => {
        set({ enabledRules: rules });
      },
      
      isRuleEnabled: (ruleId: string) => {
        return get().enabledRules.includes(ruleId);
      }
    }),
    {
      name: 'rule-store', // unique name for localStorage
      version: 1,
    }
  )
);
