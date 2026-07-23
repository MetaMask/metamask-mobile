import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { showAlreadySyncedSheet } from './showAlreadySyncedSheet';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

describe('showAlreadySyncedSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the shared success/error sheet with already-synced copy and close', () => {
    showAlreadySyncedSheet(mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        type: 'success',
        title: strings('app_settings.add_device.already_synced_title'),
        description: strings(
          'app_settings.add_device.already_synced_description',
        ),
        descriptionAlign: 'center',
        primaryButtonLabel: strings(
          'app_settings.add_device.already_synced_button',
        ),
        closeOnPrimaryButtonPress: true,
      },
    });
  });
});
