import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';
import { navigateToQrSyncImport } from './navigateToQrSyncImport';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

describe('navigateToQrSyncImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the shared QR sync import screen', () => {
    navigateToQrSyncImport(mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
      {
        initialStep: 1,
        qrSyncImport: true,
      },
    );
  });
});
