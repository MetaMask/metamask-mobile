import { IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import ToastService from '../../../../core/ToastService';
import { showGenericErrorToast } from './showGenericErrorToast';

jest.mock('../../../../core/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: jest.fn(),
  },
}));

describe('showGenericErrorToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a localized error toast', () => {
    showGenericErrorToast();

    expect(ToastService.showToast).toHaveBeenCalledWith({
      variant: ToastVariants.Icon,
      iconName: IconName.Error,
      iconColor: IconColor.ErrorDefault,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('bridge.generic_error_toast_title'),
          isBold: true,
        },
        { label: '\n' },
        { label: strings('bridge.generic_error_toast_body') },
      ],
    });
  });
});
