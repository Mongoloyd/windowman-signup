import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * Quote Analysis Theater - Post-Upload Animation
 * Shows dramatic reveal of analysis results with animated progress bars
 * 
 * Usage:
 * <QuoteAnalysisTheater 
 *   isOpen={true}
 *   scores={[92, 78, 85, 82, 88]}
 *   onClose={() => setIsOpen(false)}
 * />
 */

export default function QuoteAnalysisTheater({ 
  isOpen = false, 
  onClose,
  scores = [92, 78, 85, 82, 88] // Default scores for each pillar
}) {
  const [animationStage, setAnimationStage] = useState('initial'); // initial, analyzing, revealing, complete
  const [visibleBars, setVisibleBars] = useState([]);
  const [currentBar, setCurrentBar] = useState(-1);

  // Analysis pillars configuration
  const pillars = [
    { id: 1, name: 'Safety & Code Match', score: scores[0] },
    { id: 2, name: 'Install & Scope Clarity', score: scores[1] },
    { id: 3, name: 'Price Fairness', score: scores[2] },
    { id: 4, name: 'Fine Print Transparency', score: scores[3] },
    { id: 5, name: 'Warranty Value', score: scores[4] }
  ];

  // Calculate overall grade and score
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const overallGrade = getLetterGrade(overallScore);

  // Start animation sequence when opened
  useEffect(() => {
    if (isOpen) {
      setAnimationStage('initial');
      setVisibleBars([]);
      setCurrentBar(-1);

      // Stage 1: Initial (0.5s)
      setTimeout(() => setAnimationStage('analyzing'), 500);

      // Stage 2: Start revealing bars one by one
      setTimeout(() => {
        setAnimationStage('revealing');
        revealBarsSequentially();
      }, 1500);
    }
  }, [isOpen]);

  // Sequentially reveal each progress bar
  const revealBarsSequentially = () => {
    pillars.forEach((_, index) => {
      setTimeout(() => {
        setCurrentBar(index);
        setTimeout(() => {
          setVisibleBars(prev => [...prev, index]);
        }, 1000); // Bar fills for 1 second
      }, index * 1500); // 1.5 seconds between each bar
    });

    // Mark as complete after all bars are done
    setTimeout(() => {
      setAnimationStage('complete');
    }, pillars.length * 1500 + 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="analysis-theater-overlay">
        <motion.div
          className="analysis-theater"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <motion.div
            className="theater-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="header-title">
              Your Quote Analysis — 
              <span className="header-grade"> Grade: {overallGrade}</span>
              <span className="header-score"> | Score: {overallScore}/100</span>
            </h2>
            <p className="header-subtitle">
              {animationStage === 'analyzing' && 'Analyzing your quote...'}
              {animationStage === 'revealing' && 'Running comprehensive audit...'}
              {animationStage === 'complete' && 'Analysis complete. Here\'s your grade...'}
            </p>
          </motion.div>

          <div className="theater-content">
            {/* Left: Grade Badge */}
            <motion.div
              className="grade-section"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="grade-badge">
                <motion.div
                  className="grade-ring"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1, duration: 0.8, type: 'spring' }}
                >
                  <svg className="ring-svg" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      fill="none"
                      stroke="rgba(64, 224, 208, 0.2)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="85"
                      fill="none"
                      stroke="url(#gradeGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={534}
                      initial={{ strokeDashoffset: 534 }}
                      animate={{ strokeDashoffset: 534 - (534 * overallScore / 100) }}
                      transition={{ delay: 1.5, duration: 2, ease: 'easeOut' }}
                      style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                    />
                    <defs>
                      <linearGradient id="gradeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#40E0D0" />
                        <stop offset="100%" stopColor="#00BCD4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <motion.div
                    className="grade-letter"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2, duration: 0.5 }}
                  >
                    {overallGrade}
                  </motion.div>
                </motion.div>
                
                <motion.div
                  className="grade-score-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                >
                  Score: {overallScore}/100
                </motion.div>
              </div>
            </motion.div>

            {/* Right: Progress Bars */}
            <div className="pillars-section">
              {pillars.map((pillar, index) => (
                <PillarProgressBar
                  key={pillar.id}
                  pillar={pillar}
                  index={index}
                  isActive={currentBar === index}
                  isComplete={visibleBars.includes(index)}
                  delay={index * 1.5}
                />
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            className="theater-footer"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: animationStage === 'complete' ? 1 : 0, y: animationStage === 'complete' ? 0 : 30 }}
            transition={{ duration: 0.6 }}
          >
            <button className="cta-button">
              For a Better Quote, Call WindowMan
            </button>
          </motion.div>

          {/* Close button */}
          {onClose && (
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          )}
        </motion.div>

        <style jsx>{`
          .analysis-theater-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }

          .analysis-theater {
            width: 100%;
            max-width: 1400px;
            background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
            border-radius: 24px;
            padding: 60px;
            position: relative;
            box-shadow: 0 50px 100px rgba(0, 0, 0, 0.5);
          }

          .theater-header {
            text-align: center;
            margin-bottom: 60px;
          }

          .header-title {
            font-size: 42px;
            font-weight: 800;
            color: #FFFFFF;
            margin-bottom: 12px;
          }

          .header-grade {
            background: linear-gradient(135deg, #40E0D0 0%, #00BCD4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .header-score {
            background: linear-gradient(135deg, #40E0D0 0%, #00BCD4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .header-subtitle {
            font-size: 20px;
            color: #94A3B8;
          }

          .theater-content {
            display: grid;
            grid-template-columns: 450px 1fr;
            gap: 80px;
            margin-bottom: 60px;
          }

          .grade-section {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .grade-badge {
            text-align: center;
          }

          .grade-ring {
            position: relative;
            width: 320px;
            height: 320px;
            margin-bottom: 24px;
          }

          .ring-svg {
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 0 40px rgba(64, 224, 208, 0.6));
          }

          .grade-letter {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 140px;
            font-weight: 900;
            background: linear-gradient(135deg, #40E0D0 0%, #00BCD4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 0 30px rgba(64, 224, 208, 0.5));
            line-height: 1;
          }

          .grade-score-text {
            font-size: 24px;
            font-weight: 700;
            color: #FFFFFF;
          }

          .pillars-section {
            display: flex;
            flex-direction: column;
            gap: 24px;
            justify-content: center;
          }

          .theater-footer {
            text-align: center;
          }

          .cta-button {
            padding: 20px 60px;
            background: linear-gradient(135deg, #40E0D0 0%, #00BCD4 100%);
            color: #0F172A;
            font-size: 24px;
            font-weight: 800;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            box-shadow: 
              0 0 60px rgba(64, 224, 208, 0.6),
              0 20px 40px rgba(64, 224, 208, 0.3);
            transition: all 0.3s ease;
          }

          .cta-button:hover {
            transform: translateY(-4px);
            box-shadow: 
              0 0 80px rgba(64, 224, 208, 0.8),
              0 25px 50px rgba(64, 224, 208, 0.4);
          }

          .close-button {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            color: #FFFFFF;
            font-size: 28px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .close-button:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          @media (max-width: 1024px) {
            .theater-content {
              grid-template-columns: 1fr;
              gap: 40px;
            }
            .grade-ring {
              width: 240px;
              height: 240px;
            }
            .grade-letter {
              font-size: 100px;
            }
          }

          @media (max-width: 768px) {
            .analysis-theater {
              padding: 30px 20px;
            }
            .header-title {
              font-size: 28px;
            }
            .header-subtitle {
              font-size: 16px;
            }
            .cta-button {
              font-size: 18px;
              padding: 16px 40px;
            }
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
}

// Individual Pillar Progress Bar Component
function PillarProgressBar({ pillar, index, isActive, isComplete, delay }) {
  const [displayScore, setDisplayScore] = useState(0);
  const isGood = pillar.score >= 90;

  // Animate score counting
  useEffect(() => {
    if (isActive) {
      let currentScore = 0;
      const increment = pillar.score / 50; // 50 frames to reach target
      const timer = setInterval(() => {
        currentScore += increment;
        if (currentScore >= pillar.score) {
          setDisplayScore(pillar.score);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.round(currentScore));
        }
      }, 20);
      return () => clearInterval(timer);
    }
  }, [isActive, pillar.score]);

  return (
    <motion.div
      className="pillar-bar"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay + 0.5, duration: 0.4 }}
    >
      <div className="pillar-header">
        <span className="pillar-name">
          {pillar.id}. {pillar.name}
        </span>
        <span className={`pillar-percentage ${isGood ? 'good' : 'warning'}`}>
          {isActive || isComplete ? `${displayScore}%` : '—'}
        </span>
      </div>

      <div className="pillar-score">
        Score {isActive || isComplete ? displayScore : 0}/100
      </div>

      <div className="progress-container">
        <div className="progress-track">
          <motion.div
            className={`progress-fill ${isGood ? 'good' : 'warning'}`}
            initial={{ width: 0 }}
            animate={{ width: isActive || isComplete ? `${pillar.score}%` : 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        <motion.div
          className={`pillar-icon ${isGood ? 'good' : 'warning'}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: isComplete ? 1 : 0, scale: isComplete ? 1 : 0 }}
          transition={{ delay: 0.3, duration: 0.3, type: 'spring' }}
        >
          {isGood ? (
            <CheckCircle className="icon" />
          ) : (
            <AlertTriangle className="icon" />
          )}
        </motion.div>
      </div>

      <style jsx>{`
        .pillar-bar {
          background: rgba(30, 41, 59, 0.6);
          border: 2px solid rgba(64, 224, 208, 0.2);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .pillar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .pillar-name {
          font-size: 18px;
          font-weight: 700;
          color: #FFFFFF;
        }

        .pillar-percentage {
          font-size: 24px;
          font-weight: 900;
        }

        .pillar-percentage.good {
          color: #10B981;
        }

        .pillar-percentage.warning {
          color: #F59E0B;
        }

        .pillar-score {
          font-size: 14px;
          margin-bottom: 16px;
        }

        .pillar-score {
          color: #10B981;
        }

        .progress-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .progress-track {
          flex: 1;
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 1s ease-out;
        }

        .progress-fill.good {
          background: linear-gradient(90deg, #10B981 0%, #059669 100%);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }

        .progress-fill.warning {
          background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
        }

        .pillar-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pillar-icon.good {
          background: #10B981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
        }

        .pillar-icon.warning {
          background: #F59E0B;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
        }

        .icon {
          width: 24px;
          height: 24px;
          color: #FFFFFF;
        }
      `}</style>
    </motion.div>
  );
}

// Helper function to calculate letter grade
function getLetterGrade(score) {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}
