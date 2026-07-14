import { strings } from '../../../locales/i18n';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';
import { showImportFailedSheet } from './showImportFailedSheet';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

describe('showImportFailedSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the shared success/error sheet with import-failed copy and close', () => {
    showImportFailedSheet(mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        type: 'error',
        title: strings('app_settings.add_device.import_failed_title'),
        description: strings(
          'app_settings.add_device.import_failed_description',
        ),
        descriptionAlign: 'center',
        primaryButtonLabel: strings(
          'app_settings.add_device.import_failed_button',
        ),
        closeOnPrimaryButtonPress: true,
      },
    });
  });
});
