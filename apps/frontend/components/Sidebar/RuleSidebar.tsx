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
          <h3>Rule Details</h3>
          <button onClick={handleClose} className="close-button">×</button>
        </div>
        <div className="sidebar-content">
          <p className="rule-id"><strong>Rule:</strong> {ruleId}</p>
          <p className="severity" style={{ color: severityColor }}>
            <strong>Severity:</strong> {severity.toUpperCase()}
          </p>
          <p className="affected-text">
            <strong>Affected Text:</strong> "<span style={{ backgroundColor: severityColor + '33', padding: '2px 4px', borderRadius: '3px' }}>{range.text}</span>"
          </p>
          {explanation && (
            <div className="section">
              <h4>Explanation</h4>
              <p>{explanation}</p>
            </div>
          )}
          {suggestion && (
            <div className="section">
              <h4>Suggestion</h4>
              <p>{suggestion}</p>
            </div>
          )}
        </div>

        <style jsx>{`
          .sidebar-container {
            position: fixed;
            top: 0;
            right: 0;
            width: 350px;
            height: 100%;
            background-color: #f8f8f8;
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
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            background-color: #fff;
          }
          .sidebar-header h3 {
            margin: 0;
            font-size: 1.2em;
            font-weight: 600;
          }
          .close-button {
            background: none;
            border: none;
            font-size: 1.5em;
            cursor: pointer;
            color: #666;
            padding: 5px;
            line-height: 1;
            border-radius: 3px;
          }
          .close-button:hover {
            color: #333;
            background-color: #f0f0f0;
          }
          .sidebar-content {
            padding: 20px;
            overflow-y: auto;
            flex-grow: 1;
          }
          .sidebar-content p {
            margin-bottom: 10px;
            line-height: 1.5;
            font-size: 0.95em;
          }
          .sidebar-content strong {
            color: #000;
          }
          .section {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
          }
          .section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1em;
            font-weight: 600;
            color: #555;
          }
          .rule-id {
            font-size: 1.1em;
            font-weight: 500;
            margin-bottom: 15px;
          }
          .severity {
            font-weight: 500;
            margin-bottom: 15px;
          }
          .affected-text {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 5px;
            border: 1px solid #e0e0e0;
          }
        `}</style>
      </div>
    </>
  );
};

export default RuleSidebar;
