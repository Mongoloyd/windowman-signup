import React, { useState, useEffect } from 'react';
    import QuoteAnalysisTheater from './QuoteAnalysisTheater';
    
    interface GateProps {
      scanId: string;
      scored: any;
      children: React.ReactNode;
    }
    
    const QuoteRevealGate = ({ scanId, scored, children }: GateProps) => {
      const [showTheater, setShowTheater] = useState(false);
      const [loading, setLoading] = useState(true);
    
      useEffect(() => {
        const hasSeen = localStorage.getItem(`seen_theater_${scanId}`);
        if (!hasSeen) {
          setShowTheater(true);
        }
        setLoading(false);
      }, [scanId]);
    
      const handleComplete = () => {
        localStorage.setItem(`seen_theater_${scanId}`, 'true');
        setShowTheater(false);
      };
    
      if (loading) return null;
      if (showTheater) return <QuoteAnalysisTheater scored={scored} onComplete={handleComplete} />;
      
      return <>{children}</>;
    };
    
    export default QuoteRevealGate;
