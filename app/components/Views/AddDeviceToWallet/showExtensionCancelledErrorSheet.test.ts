import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { showExtensionCancelledErrorSheet } from './showExtensionCancelledErrorSheet';

const mockNavigate = jest.fn();
const mockAcknowledgePeerCancellation = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      acknowledgePeerCancellation: (...args: unknown[]) =>
        mockAcknowledgePeerCancellation(...args),
    },
  },
}));

describe('showExtensionCancelledErrorSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the shared success/error sheet with extension-cancel copy', () => {
    showExtensionCancelledErrorSheet(mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: expect.objectContaining({
        type: 'error',
        title: strings('app_settings.add_device.extension_cancelled_title'),
        description: strings(
          'app_settings.add_device.extension_cancelled_description',
        ),
        descriptionAlign: 'center',
        primaryButtonLabel: strings(
          'app_settings.add_device.extension_cancelled_button',
        ),
        closeOnPrimaryButtonPress: true,
        onPrimaryButtonPress: expect.any(Function),
      }),
    });
  });

  it('acknowledges peer cancellation when try again is pressed', () => {
    showExtensionCancelledErrorSheet(mockNavigation);

    const { params } = mockNavigate.mock.calls[0][1] as {
      params: { onPrimaryButtonPress?: () => void };
    };

    params.onPrimaryButtonPress?.();

    expect(mockAcknowledgePeerCancellation).toHaveBeenCalledTimes(1);
  });
});
