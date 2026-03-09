import { useEffect, useState } from 'react';

/**
 * Hook to detect if the viewport is mobile-sized (< 768px, md breakpoint)
 * Returns true for mobile, false for desktop
 * Handles SSR by defaulting to false (desktop)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Set hydrated flag to true after mount
    setIsHydrated(true);

    // Initial check
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();

    // Listen for resize events
    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Return false during SSR, actual value after hydration
  return isHydrated ? isMobile : false;
}
