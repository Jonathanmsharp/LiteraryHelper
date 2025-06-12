import { useState, useCallback } from 'react';
import { create } from 'zustand';
import axios from 'axios';

type RuleMatch = {
  ruleId: string;
  range: { start: number; end: number; text: string; };
  suggestion?: string;
  explanation?: string;
  severity: 'info' | 'warning' | 'error';
};

type AnalysisResult = {
  message: string;
  userId?: string;
  sessionId?: string;
  jobId?: string;
  textLength: number;
  matchCount: number;
  matches: RuleMatch[];
  status: 'idle' | 'processing' | 'completed' | 'error';
  fromCache?: boolean;
  statusEndpoint?: string;
};

interface AnalysisState {
  analysisId: string | null;
  isLoading: boolean;
  error: string | null;
  results: RuleMatch[];
  progress: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  fromCache: boolean;
  setAnalysisId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: RuleMatch[]) => void;
  setProgress: (progress: number) => void;
  setStatus: (status: 'idle' | 'processing' | 'completed' | 'error') => void;
  setFromCache: (fromCache: boolean) => void;
  reset: () => void;
}

const useAnalysisStore = create<AnalysisState>((set) => ({
  analysisId: null, isLoading: false, error: null, results: [], progress: 0,
  status: 'idle', fromCache: false,
  setAnalysisId: (id) => set({ analysisId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setResults: (results) => set({ results }),
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setFromCache: (fromCache) => set({ fromCache }),
  reset: () => set({ analysisId: null, isLoading: false, error: null, results: [], progress: 0, status: 'idle', fromCache: false }),
}));

export const useAnalysis = () => {
  const {
    analysisId, isLoading, error, results, progress, status, fromCache,
    setAnalysisId, setIsLoading, setError, setResults, setProgress, setStatus, setFromCache, reset,
  } = useAnalysisStore();

  const analyzeText = useCallback(async (text: string) => {
    reset();
    setIsLoading(true);
    setStatus('processing');

    try {
      console.log('[useAnalysis] Starting analysis for', text.length, 'characters');
      
      const response = await axios.post<AnalysisResult>('/api/analyze', { text });
      const { jobId, statusEndpoint, matches, status: apiStatus, fromCache: cached } = response.data;

      setFromCache(cached || false);

      if (apiStatus === 'completed' || !jobId) {
        setResults(matches || []);
        setProgress(100);
        setStatus('completed');
        setIsLoading(false);
        console.log('[useAnalysis] Analysis completed with', matches?.length || 0, 'matches');
      } else if (jobId && statusEndpoint) {
        setAnalysisId(jobId);
        console.log('[useAnalysis] Starting polling for job', jobId);
        // TODO: Add polling logic here
      }
    } catch (err) {
      console.error('[useAnalysis] Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
      setIsLoading(false);
    }
  }, [setAnalysisId, setIsLoading, setError, setResults, setProgress, setStatus, setFromCache, reset]);

  return { analysisId, isLoading, error, results, progress, status, fromCache, analyzeText, reset };
};
