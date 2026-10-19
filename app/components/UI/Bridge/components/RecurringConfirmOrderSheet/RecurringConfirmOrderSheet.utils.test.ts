import { IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import ToastService from '../../../../../core/ToastService';
import {
  showRecurringOrderCanceledToast,
  showRecurringOrderCreatedToast,
} from './RecurringConfirmOrderSheet.utils';

jest.mock('../../../../../core/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: jest.fn(),
  },
}));

describe('showRecurringOrderCreatedToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an icon toast with localized order created copy', () => {
    showRecurringOrderCreatedToast();

    expect(ToastService.showToast).toHaveBeenCalledWith({
      variant: ToastVariants.Icon,
      iconName: IconName.Confirmation,
      iconColor: IconColor.SuccessDefault,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('bridge.recurring.order_created_toast_title'),
          isBold: true,
        },
        { label: '\n' },
        { label: strings('bridge.recurring.order_created_toast_body') },
      ],
    });
  });
});

describe('showRecurringOrderCanceledToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an icon toast with localized order canceled copy', () => {
    showRecurringOrderCanceledToast();

    expect(ToastService.showToast).toHaveBeenCalledWith({
      variant: ToastVariants.Icon,
      iconName: IconName.Error,
      iconColor: IconColor.ErrorDefault,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('bridge.recurring.order_canceled_toast_title'),
          isBold: true,
        },
      ],
    });
  });
});
