import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

export const navigateToQrSyncImport = (navigation: AppNavigationProp): void => {
  navigation.navigate(Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE, {
    initialStep: 1,
    qrSyncImport: true,
  });
};
