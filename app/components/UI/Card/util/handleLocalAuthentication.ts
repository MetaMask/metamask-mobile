import { CardLocation } from '../types';
import { tokenManager } from './tokenManager';

export const handleLocalAuthentication = async ({
  isBaanxLoginEnabled,
}: {
  isBaanxLoginEnabled: boolean;
}): Promise<{
  isAuthenticated: boolean;
  userCardLocation?: CardLocation;
}> => {
  try {
    if (!isBaanxLoginEnabled) {
      return { isAuthenticated: false };
    }

    return await tokenManager.checkAuthenticationStatus();
  } catch (error) {
    return {
      isAuthenticated: false,
    };
  }
};
