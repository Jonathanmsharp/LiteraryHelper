import React, { useState } from 'react';

interface Tip {
  id: string;
  title: string;
  description: string;
  examples: {
    incorrect: string;
    correct: string;
  }[];
}

const TIPS: Tip[] = [
  {
    id: 'strong-verbs',
    title: 'Rule 1: Use Strong Verbs',
    description: 'Replace weak verbs with more descriptive, powerful ones',
    examples: [
      { incorrect: 'She walked to the store.', correct: 'She sprinted to the store.' },
      { incorrect: 'He stood in the doorway.', correct: 'He loomed in the doorway.' },
      { incorrect: 'The dog ran fast down the street.', correct: 'The dog dashed down the street.' }
    ]
  },
  {
    id: 'question-being-having',
    title: 'Rule 2: Question Being and Having',
    description: 'Replace forms of "to be" and "to have" with more active, engaging verbs',
    examples: [
      { incorrect: 'I am tired.', correct: 'Fatigue set in.' },
      { incorrect: 'She is a talented artist.', correct: 'She shines as a talented artist.' },
      { incorrect: 'He has a lot of experience.', correct: 'He brings a wealth of experience.' },
      { incorrect: 'They are in a difficult situation.', correct: 'They face a difficult situation.' },
      { incorrect: 'She is happy.', correct: 'Joy radiates from her.' }
    ]
  },
  {
    id: 'stick-with-said',
    title: 'Rule 3: Stick with "Said"',
    description: 'Use "said" instead of fancy alternatives in dialogue attribution',
    examples: [
      { incorrect: '"I\'m not sure about that," she chuckled.', correct: '"I\'m not sure about that," she said.' },
      { incorrect: '"That\'s a great idea," he smiled.', correct: '"That\'s a great idea," he said.' },
      { incorrect: '"I don\'t think so," she explained.', correct: '"I don\'t think so," she said.' },
      { incorrect: '"This is what I meant," he remarked.', correct: '"This is what I meant," he said.' },
      { incorrect: '"Let\'s go!" she shouted.', correct: '"Let\'s go!" she said.' }
    ]
  },
  {
    id: 'jettison-tiny-words',
    title: 'Rule 4: Jettison Tiny Words',
    description: 'Remove unnecessary small words that weaken your writing',
    examples: [
      { incorrect: 'The very small dog barked.', correct: 'The tiny dog barked.' },
      { incorrect: 'She was quite tired.', correct: 'She was exhausted.' },
      { incorrect: 'It was really good.', correct: 'It was excellent.' },
      { incorrect: 'He was just standing there.', correct: 'He stood there.' },
      { incorrect: 'The book was so interesting.', correct: 'The book fascinated me.' }
    ]
  },
  {
    id: 'drop-crutch-words',
    title: 'Rule 5: Drop "Very" and Other Crutch Words',
    description: 'Eliminate weak intensifiers and filler words',
    examples: [
      { incorrect: 'The movie was very good.', correct: 'The movie was excellent.' },
      { incorrect: 'She was really angry.', correct: 'She was furious.' },
      { incorrect: 'It was quite large.', correct: 'It was enormous.' },
      { incorrect: 'He was pretty tired.', correct: 'He was exhausted.' },
      { incorrect: 'The food was really delicious.', correct: 'The food was exquisite.' }
    ]
  },
  {
    id: 'question-transitions',
    title: 'Rule 6: Question Transitions',
    description: 'Use transitions that add meaning, not just connection',
    examples: [
      { incorrect: 'She went to the store. Then she came home.', correct: 'She went to the store and returned home.' },
      { incorrect: 'He studied hard. Therefore, he passed.', correct: 'His hard work paid off—he passed.' },
      { incorrect: 'The weather was bad. However, we went out.', correct: 'Despite the bad weather, we went out.' },
      { incorrect: 'She was tired. So she went to bed.', correct: 'Exhausted, she went to bed.' },
      { incorrect: 'He failed the test. But he tried again.', correct: 'He failed the test yet persevered.' }
    ]
  }
];

const TipsSection: React.FC = () => {
  const [expandedTip, setExpandedTip] = useState<string | null>('strong-verbs');

  const toggleTip = (tipId: string) => {
    setExpandedTip(expandedTip === tipId ? null : tipId);
  };

  return (
    <div className="tips-section">
      <h2 className="tips-title">Writing Tips</h2>
      <p className="tips-subtitle">Master these essential writing rules with examples</p>
      
      <div className="tips-list">
        {TIPS.map((tip) => (
          <div key={tip.id} className={`tip-card ${expandedTip === tip.id ? 'expanded' : ''}`}>
            <div className="tip-header" onClick={() => toggleTip(tip.id)}>
              <h3 className="tip-title">{tip.title}</h3>
              <div className="tip-arrow">
                {expandedTip === tip.id ? '▼' : '▶'}
              </div>
            </div>
            
            {expandedTip === tip.id && (
              <div className="tip-content">
                <p className="tip-description">{tip.description}</p>
                <div className="examples">
                  {tip.examples.map((example, index) => (
                    <div key={index} className="example-pair">
                      <div className="example incorrect">
                        <span className="example-marker">❌</span>
                        <span className="example-text">{example.incorrect}</span>
                      </div>
                      <div className="example correct">
                        <span className="example-marker">✅</span>
                        <span className="example-text">{example.correct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .tips-section {
          max-width: 800px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .tips-title {
          font-family: 'Georgia', serif;
          font-size: 2.5em;
          color: #4a7c7e;
          text-align: center;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .tips-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 1.1em;
          color: #666;
          text-align: center;
          margin-bottom: 40px;
        }

        .tips-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tip-card {
          background: white;
          border: 2px solid #4a7c7e;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(74, 124, 126, 0.1);
          transition: all 0.3s ease;
        }

        .tip-card:hover {
          box-shadow: 0 6px 20px rgba(74, 124, 126, 0.15);
          transform: translateY(-2px);
        }

        .tip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          cursor: pointer;
          background: linear-gradient(135deg, #4a7c7e 0%, #5a8a8c 100%);
          color: white;
          transition: background 0.3s ease;
        }

        .tip-header:hover {
          background: linear-gradient(135deg, #5a8a8c 0%, #4a7c7e 100%);
        }

        .tip-title {
          font-family: 'Inter', sans-serif;
          font-size: 1.3em;
          font-weight: 600;
          margin: 0;
        }

        .tip-arrow {
          font-size: 1.2em;
          transition: transform 0.3s ease;
        }

        .tip-card.expanded .tip-arrow {
          transform: rotate(0deg);
        }

        .tip-content {
          padding: 25px;
          background: #fdfcfb;
        }

        .tip-description {
          font-family: 'Inter', sans-serif;
          font-size: 1.1em;
          color: #333;
          margin-bottom: 25px;
          line-height: 1.6;
        }

        .examples {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .example-pair {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .example {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          font-family: 'Georgia', serif;
          font-size: 1em;
          line-height: 1.5;
        }

        .example.incorrect {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
        }

        .example.correct {
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
        }

        .example-marker {
          font-size: 1.2em;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .example-text {
          flex: 1;
        }

        @media (max-width: 768px) {
          .tips-section {
            margin: 20px auto;
            padding: 0 15px;
          }

          .tips-title {
            font-size: 2em;
          }

          .tip-header {
            padding: 15px;
          }

          .tip-title {
            font-size: 1.1em;
          }

          .tip-content {
            padding: 20px;
          }

          .example {
            font-size: 0.95em;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default TipsSection;
