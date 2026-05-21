import { useCallback, useEffect, useState } from 'react';
import { supportsAlternateIcons } from 'expo-alternate-app-icons';
import {
  type AppIconName,
  getAppIcon,
  setAppIcon,
} from '../core/AppIconSwitcher';

interface UseAppIconResult {
  currentIcon: AppIconName;
  isLoading: boolean;
  isSupported: boolean;
  switchToGold: () => Promise<void>;
  switchToDefault: () => Promise<void>;
  /** Mock: toggle VIP status to test icon switching without real rewards logic. */
  mockToggleVipStatus: () => Promise<void>;
}

/**
 * Hook for managing the app launcher icon.
 *
 * The `mockToggleVipStatus` helper lets the rewards team (or QA) test icon
 * switching without wiring up real VIP/rewards logic. Replace it with calls
 * to `switchToGold` / `switchToDefault` driven by actual VIP status once the
 * rewards integration is ready.
 */
export function useAppIcon(): UseAppIconResult {
  const [currentIcon, setCurrentIcon] = useState<AppIconName>(() =>
    getAppIcon(),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentIcon(getAppIcon());
  }, []);

  const switchToGold = useCallback(async () => {
    setIsLoading(true);
    try {
      await setAppIcon('Gold');
      setCurrentIcon('Gold');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchToDefault = useCallback(async () => {
    setIsLoading(true);
    try {
      await setAppIcon('default');
      setCurrentIcon('default');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const mockToggleVipStatus = useCallback(async () => {
    if (currentIcon === 'Gold') {
      await switchToDefault();
    } else {
      await switchToGold();
    }
  }, [currentIcon, switchToDefault, switchToGold]);

  return {
    currentIcon,
    isLoading,
    isSupported: supportsAlternateIcons,
    switchToGold,
    switchToDefault,
    mockToggleVipStatus,
  };
}
