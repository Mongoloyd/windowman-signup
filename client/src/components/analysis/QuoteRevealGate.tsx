import React, { useEffect, useMemo, useState } from "react";
import QuoteAnalysisTheater from "./QuoteAnalysisTheater";

type Props = {
  scanId: string;
  scored: any;
  children: React.ReactNode;
};

function keyFor(scanId: string) {
  return `wm_theater_seen:${scanId}`;
}

export default function QuoteRevealGate({ scanId, scored, children }: Props) {
  const storageKey = useMemo(() => keyFor(scanId), [scanId]);
  const [showTheater, setShowTheater] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey) === "1";
      if (seen) {
        setReady(true);
        setShowTheater(false);
        return;
      }
    } catch { }
    setShowTheater(true);
  }, [storageKey]);

  const complete = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch { }
    setShowTheater(false);
    setReady(true);
  };

  return (
    <>
      {showTheater && <QuoteAnalysisTheater scanId={scanId} scored={scored} onComplete={complete} />}
      {ready && children}
    </>
  );
}
