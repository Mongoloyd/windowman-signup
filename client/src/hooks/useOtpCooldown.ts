/**
 * useOtpCooldown
 *
 * Manages the progressive backoff countdown timer for OTP verification.
 * When the server returns a cooldownRemainingMs value in the error cause,
 * this hook ticks down every second and exposes:
 *   - secondsLeft: number of seconds remaining in the cooldown (0 = allowed)
 *   - captchaRequired: whether tier-4 CAPTCHA gate is active
 *   - isBlocked: true while secondsLeft > 0
 *   - formattedTime: human-readable countdown string ("1:45", "30s", etc.)
 *   - startCooldown(ms, captcha): call this from the mutation onError handler
 *   - clearCooldown(): call on successful verification or new OTP send
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface OtpCooldownState {
  secondsLeft: number;
  captchaRequired: boolean;
  isBlocked: boolean;
  formattedTime: string;
  startCooldown: (cooldownMs: number, captcha?: boolean) => void;
  clearCooldown: () => void;
}

function formatSeconds(s: number): string {
  if (s <= 0) return "";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function useOtpCooldown(): OtpCooldownState {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCooldown = useCallback(() => {
    clearTimer();
    setSecondsLeft(0);
    setCaptchaRequired(false);
  }, [clearTimer]);

  const startCooldown = useCallback(
    (cooldownMs: number, captcha = false) => {
      clearTimer();
      const seconds = Math.ceil(cooldownMs / 1000);
      if (seconds <= 0) return; // 0s cooldown (tier 1) — no block
      setSecondsLeft(seconds);
      setCaptchaRequired(captcha);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    secondsLeft,
    captchaRequired,
    isBlocked: secondsLeft > 0,
    formattedTime: formatSeconds(secondsLeft),
    startCooldown,
    clearCooldown,
  };
}
