import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionCustomAmountAlerts } from './useTransactionCustomAmountAlerts';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import {
  AlertsContextParams,
  useAlerts,
} from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';
import { usePendingAmountAlerts } from '../alerts/usePendingAmountAlerts';
import { Alert } from '../../types/alerts';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('../../context/alert-system-context');
jest.mock('../alerts/usePendingAmountAlerts');
jest.mock('./useTransactionMetadataRequest');

const TITLE_MOCK = 'Test Title';
const MESSAGE_MOCK = 'Test Message';

const ALERT_MOCK = {
  key: AlertKeys.SignedOrSubmitted,
  title: TITLE_MOCK,
  message: MESSAGE_MOCK,
  isBlocking: true,
} as Alert;

function runHook({
  isInputChanged = false,
  isKeyboardVisible = false,
  pendingTokenAmount = '0',
  hasMax = false,
}: {
  isInputChanged?: boolean;
  isKeyboardVisible?: boolean;
  pendingTokenAmount?: string;
  hasMax?: boolean;
} = {}) {
  return renderHookWithProvider(
    () =>
      useTransactionCustomAmountAlerts({
        isInputChanged,
        isKeyboardVisible,
        pendingTokenAmount,
        hasMax,
      }),
    {
      state: merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      ),
    },
  );
}

describe('useTransactionCustomAmountAlerts', () => {
  const useAlertsMock = jest.mocked(useAlerts);
  const usePendingAmountAlertsMock = jest.mocked(usePendingAmountAlerts);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useAlertsMock.mockReturnValue({
      alerts: [{}],
    } as AlertsContextParams);

    usePendingAmountAlertsMock.mockReturnValue([]);

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
  });

  it('returns title as alert title if present', () => {
    useAlertsMock.mockReturnValue({
      alerts: [ALERT_MOCK],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.alertTitle).toBe(TITLE_MOCK);
  });

  it('returns message as alert title if no title', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          title: undefined,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.alertTitle).toBe(MESSAGE_MOCK);
  });

  it('returns alert message as message if title', () => {
    useAlertsMock.mockReturnValue({
      alerts: [ALERT_MOCK],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.alertMessage).toBe(MESSAGE_MOCK);
  });

  it('returns no alert message if no title', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          title: undefined,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.alertMessage).toBeUndefined();
  });

  it('returns pending alert', () => {
    const PENDING_ALERT_MOCK = {
      ...ALERT_MOCK,
      key: AlertKeys.SignedOrSubmitted,
    };

    usePendingAmountAlertsMock.mockReturnValue([PENDING_ALERT_MOCK]);

    const { result } = runHook();

    expect(result.current.alertTitle).toBe(PENDING_ALERT_MOCK.title);
    expect(result.current.alertMessage).toBe(PENDING_ALERT_MOCK.message);
  });

  it('does not return alert if on change alert and input not changed', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          key: AlertKeys.PerpsDepositMinimum,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.alertMessage).toBeUndefined();
  });

  it('does not return alert if keyboard visible and not keyboard alert', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          key: AlertKeys.NoPayTokenQuotes,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook({ isKeyboardVisible: true });

    expect(result.current.alertMessage).toBeUndefined();
  });

  it('does not return non-blocking alerts', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          isBlocking: false,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.alertMessage).toBeUndefined();
  });

  it('does not return alert if keyboard visible and pending alert', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          key: AlertKeys.InsufficientPayTokenBalance,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook({
      isInputChanged: true,
      isKeyboardVisible: true,
    });

    expect(result.current.alertMessage).toBeUndefined();
  });

  it('filters InsufficientPayTokenBalance when hasMax is true for musdConversion transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
      txParams: { from: '0x123' },
    } as never);

    useAlertsMock.mockReturnValue({
      alerts: [
        {
          ...ALERT_MOCK,
          key: AlertKeys.InsufficientPayTokenBalance,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook({
      hasMax: true,
      isInputChanged: true,
      isKeyboardVisible: false,
    });

    expect(result.current.alertTitle).toBeUndefined();
    expect(result.current.alertMessage).toBeUndefined();
  });
});
