import React from 'react';
import Editor from '../components/Editor';
import RuleSidebar from '../components/Sidebar/RuleSidebar';
import RuleMenu from '../components/Menu/RuleMenu';

export default function HomePage() {
  return (
    <div className="app-container">
      <RuleMenu />
      <div className="main-content">
        <h1 className="app-title">Good Writing App</h1>
        <p className="app-subtitle">36 Ways to Improve Your Sentences</p>
        <div className="typewriter-container">
          <img src="/images/typewriter.jpg" alt="Vintage typewriter illustration" className="typewriter-image" />
        </div>
        <p className="editor-intro">Start typing below to analyze your writing...</p>
        <Editor placeholder="Type your text here to get real-time writing suggestions..." />
        <RuleSidebar />
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Georgia&family=Inter:wght@400;500;600;700&display=swap');

        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          background-color: #fdfcfb;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #333;
          line-height: 1.6;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
        }

        .main-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .app-title {
          font-family: 'Georgia', serif;
          font-size: 3.5em;
          color: #4a7c7e;
          margin-bottom: 5px;
          font-weight: bold;
          letter-spacing: -1px;
        }

        .app-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 1.2em;
          color: #666;
          margin-bottom: 30px;
          font-weight: 400;
        }

        .editor-intro {
          font-family: 'Inter', sans-serif;
          font-size: 1em;
          color: #555;
          margin-bottom: 20px;
        }

        .typewriter-container {
          margin-bottom: 40px;
          position: relative;
          display: inline-block;
        }

        .typewriter-image {
          max-width: 300px;
          height: auto;
          display: block;
          transition: transform 0.3s ease;
        }

        .typewriter-image:hover {
          transform: translateY(-5px);
        }

        @media (max-width: 768px) {
          .app-title {
            font-size: 2.8em;
          }
          .app-subtitle {
            font-size: 1em;
          }
          .typewriter-image {
            max-width: 250px;
          }
        }

        @media (max-width: 480px) {
          .app-title {
            font-size: 2.2em;
          }
          .app-subtitle {
            font-size: 0.9em;
          }
          .typewriter-image {
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
}
