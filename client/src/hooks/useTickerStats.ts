import { useMemo } from "react";

const START_DATE = new Date("2024-02-12");
const GROWTH_RATE = 4.9;
const TODAY_MIN = 12;
const TODAY_MAX = 28;

/**
 * Deterministic social-proof ticker stats.
 * Total grows by ~4.9/day from START_DATE; "today" is a seeded
 * random 12–28 that stays consistent for all users on the same calendar day.
 */
export function useTickerStats(): { total: number; today: number } {
  return useMemo(() => {
    const now = new Date();
    const daysPassed = Math.floor(
      (now.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24)
    );

    const todayString = now.toISOString().split("T")[0];
    let hash = 0;
    for (let i = 0; i < todayString.length; i++) {
      hash = (hash << 5) - hash + todayString.charCodeAt(i);
      hash |= 0;
    }
    const random = (Math.abs(hash) % 1000) / 1000;
    const today = Math.floor(random * (TODAY_MAX - TODAY_MIN + 1)) + TODAY_MIN;
    const total = Math.floor(daysPassed * GROWTH_RATE) + today;

    return { total, today };
  }, []);
}
