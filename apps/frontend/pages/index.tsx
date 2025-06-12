import React from 'react';
import Editor from '../components/Editor';
import RuleSidebar from '../components/Sidebar/RuleSidebar';

export default function HomePage() {
  return (
    <div className="app-container">
      <h1>Literary Helper</h1>
      <p>Start typing below to analyze your writing...</p>
      <Editor placeholder="Type your text here to get real-time writing suggestions..." />
      <RuleSidebar />
      
      <style jsx>{`
        .app-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
