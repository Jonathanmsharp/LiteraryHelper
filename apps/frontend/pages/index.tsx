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
        <img 
          src="/images/typewriter.jpg" 
          alt="Vintage typewriter illustration" 
          className="typewriter-image"
        />
      </div>
      
      <div className="content">
        <p className="instruction">Start typing below to analyze your writing...</p>
        <Editor placeholder="Type your text here to get real-time writing suggestions..." />
      </div>
      
      <RuleSidebar />
      
      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: #fefefe;
          font-family: 'Georgia', 'Times New Roman', serif;
          padding: 0;
          margin: 0;
        }
        
        .header {
          text-align: center;
          padding: 60px 20px 40px;
          background: #fefefe;
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
          background: #fefefe;
        }
        
        .typewriter-image {
          max-width: 300px;
          width: 100%;
          height: auto;
          border-radius: 0;
          box-shadow: none;
          transition: transform 0.3s ease;
          mix-blend-mode: normal;
        }
        
        .typewriter-image:hover {
          transform: translateY(-2px);
        }
        
        .content {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px 60px;
          background: #fefefe;
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
          
          .typewriter-image {
            max-width: 250px;
          }
        }
        
        @media (max-width: 480px) {
          .typewriter-image {
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
}
