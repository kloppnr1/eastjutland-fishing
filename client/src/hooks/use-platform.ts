import { useState, useEffect } from 'react';

export function useIsIOS(): boolean {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in Capacitor iOS
    const isCapacitorIOS =
      typeof window !== 'undefined' &&
      (window as any).Capacitor?.getPlatform?.() === 'ios';

    setIsIOS(isCapacitorIOS);
  }, []);

  return isIOS;
}

export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const isCapacitor =
      typeof window !== 'undefined' &&
      (window as any).Capacitor?.isNativePlatform?.();

    setIsNative(!!isCapacitor);
  }, []);

  return isNative;
}
