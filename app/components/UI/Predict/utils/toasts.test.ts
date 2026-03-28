import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { showOrderPlacedToast } from './toasts';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockShowToast = jest.fn();
jest.mock('../../../../core/ToastService/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: (...args: unknown[]) => mockShowToast(...args),
  },
}));

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();
jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

describe('showOrderPlacedToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls ToastService.showToast with the prediction placed message', () => {
    showOrderPlacedToast();

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      labelOptions: [
        {
          label: 'predict.order.prediction_placed',
          isBold: true,
        },
      ],
      hasNoTimeout: false,
    });
  });

  it('starts a performance trace before showing the toast', () => {
    showOrderPlacedToast();

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.PredictOrderConfirmationToast,
      op: TraceOperation.PredictOperation,
      id: 'order-toast-1000',
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
      },
    });
  });

  it('ends the performance trace after showing the toast', () => {
    showOrderPlacedToast();

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.PredictOrderConfirmationToast,
      id: 'order-toast-1000',
      data: { success: true },
    });
  });

  it('calls trace, then showToast, then endTrace in order', () => {
    const callOrder: string[] = [];
    mockTrace.mockImplementation(() => callOrder.push('trace'));
    mockShowToast.mockImplementation(() => callOrder.push('showToast'));
    mockEndTrace.mockImplementation(() => callOrder.push('endTrace'));

    showOrderPlacedToast();

    expect(callOrder).toEqual(['trace', 'showToast', 'endTrace']);
  });
});
