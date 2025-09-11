import React from 'react';
import Editor from '../components/Editor';
import RuleSidebar from '../components/Sidebar/RuleSidebar';

export default function HomePage() {
  return (
    <div className="app-container">
      <div className="header">
        <h1 className="main-title">
          <span className="title-word">Good</span>
          <span className="title-word large">Writing</span>
        </h1>
        <p className="subtitle">36 Ways to Improve Your Sentences</p>
      </div>
      
      <div className="typewriter-illustration">
        <div className="typewriter">
          <div className="typewriter-body"></div>
          <div className="typewriter-keys"></div>
          <div className="paper"></div>
        </div>
      </div>
      
      <div className="content">
        <p className="instruction">Start typing below to analyze your writing...</p>
        <Editor placeholder="Type your text here to get real-time writing suggestions..." />
      </div>
      
      <RuleSidebar />
      
      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf8f5 0%, #f5f2ed 100%);
          font-family: 'Georgia', 'Times New Roman', serif;
          padding: 0;
          margin: 0;
        }
        
        .header {
          text-align: center;
          padding: 60px 20px 40px;
          background: #faf8f5;
        }
        
        .main-title {
          margin: 0 0 20px 0;
          font-weight: 400;
          letter-spacing: 2px;
        }
        
        .title-word {
          display: block;
          color: #2c2c2c;
          font-size: 3.5rem;
          line-height: 1.1;
        }
        
        .title-word.large {
          font-size: 4.2rem;
          margin-top: -10px;
        }
        
        .subtitle {
          color: #4a7c7e;
          font-size: 1.1rem;
          font-weight: 300;
          margin: 0;
          letter-spacing: 1px;
          font-family: 'Helvetica Neue', Arial, sans-serif;
        }
        
        .typewriter-illustration {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
          background: #faf8f5;
        }
        
        .typewriter {
          position: relative;
          width: 200px;
          height: 120px;
        }
        
        .typewriter-body {
          width: 180px;
          height: 80px;
          background: linear-gradient(145deg, #5a8a8c, #4a7c7e);
          border-radius: 8px 8px 15px 15px;
          position: relative;
          box-shadow: 0 8px 20px rgba(74, 124, 126, 0.3);
        }
        
        .typewriter-body::before {
          content: '';
          position: absolute;
          top: 15px;
          left: 20px;
          right: 20px;
          height: 2px;
          background: #2c2c2c;
          border-radius: 1px;
        }
        
        .typewriter-body::after {
          content: '';
          position: absolute;
          bottom: 10px;
          left: 15px;
          right: 15px;
          height: 8px;
          background: #3a6a6c;
          border-radius: 4px;
        }
        
        .typewriter-keys {
          position: absolute;
          bottom: -15px;
          left: 10px;
          right: 10px;
          height: 20px;
          background: linear-gradient(145deg, #4a7c7e, #3a6a6c);
          border-radius: 0 0 8px 8px;
        }
        
        .typewriter-keys::before {
          content: '';
          position: absolute;
          top: 3px;
          left: 8px;
          right: 8px;
          height: 2px;
          background: #2c2c2c;
          border-radius: 1px;
        }
        
        .paper {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 50px;
          background: #fefefe;
          border: 1px solid #e0e0e0;
          border-radius: 2px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .paper::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          height: 1px;
          background: #f0f0f0;
        }
        
        .paper::after {
          content: '';
          position: absolute;
          top: 12px;
          left: 8px;
          right: 8px;
          height: 1px;
          background: #f0f0f0;
        }
        
        .content {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px 60px;
          background: #faf8f5;
        }
        
        .instruction {
          color: #5a5a5a;
          font-size: 1.1rem;
          margin-bottom: 30px;
          text-align: center;
          font-style: italic;
          letter-spacing: 0.5px;
        }
        
        @media (max-width: 768px) {
          .title-word {
            font-size: 2.8rem;
          }
          
          .title-word.large {
            font-size: 3.2rem;
          }
          
          .subtitle {
            font-size: 1rem;
          }
          
          .typewriter {
            width: 150px;
            height: 90px;
          }
          
          .typewriter-body {
            width: 135px;
            height: 60px;
          }
          
          .paper {
            width: 90px;
            height: 40px;
            top: -30px;
          }
        }
      `}</style>
    </div>
  );
}
