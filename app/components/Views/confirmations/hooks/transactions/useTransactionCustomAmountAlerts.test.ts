import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ON_CHANGE_ALERTS,
  useTransactionCustomAmountAlerts,
} from './useTransactionCustomAmountAlerts';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import {
  AlertsContextParams,
  useAlerts,
} from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';
import { usePerpsDepositAlerts } from '../../external/perps-temp/hooks/usePerpsDepositAlerts';

jest.mock('../../context/alert-system-context');

const TITLE_MOCK = 'Test Title';
const MESSAGE_MOCK = 'Test Message';

function runHook({
  isInputChanged = false,
  pendingTokenAmount = '0',
}: {
  isInputChanged?: boolean;
  pendingTokenAmount?: string;
} = {}) {
  return renderHookWithProvider(
    () =>
      useTransactionCustomAmountAlerts({
        isInputChanged,
        pendingTokenAmount,
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
  const usePerpsDepositAlertsMock = jest.mocked(usePerpsDepositAlerts);

  beforeEach(() => {
    jest.resetAllMocks();

    useAlertsMock.mockReturnValue({
      alerts: [{}],
    } as AlertsContextParams);
  });

  it('returns excluded keys', () => {
    const { result } = runHook();
    expect(result.current.excludeBannerKeys.length).toBeGreaterThan(0);
  });

  it('returns keyboard alert message from alert title', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          key: AlertKeys.SignedOrSubmitted,
          title: TITLE_MOCK,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.keyboardAlertMessage).toBe(TITLE_MOCK);
  });

  it('returns keyboard alert message from alert message', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          key: AlertKeys.SignedOrSubmitted,
          message: MESSAGE_MOCK,
        },
      ],
    } as AlertsContextParams);

    const { result } = runHook();

    expect(result.current.keyboardAlertMessage).toBe(MESSAGE_MOCK);
  });

  it.each(ON_CHANGE_ALERTS)(
    'does not return keyboard alert message if alert is %s and input not changed',
    (alertKey) => {
      useAlertsMock.mockReturnValue({
        alerts: [
          {
            key: alertKey,
            title: TITLE_MOCK,
          },
        ],
      } as AlertsContextParams);

      const { result } = runHook();

      expect(result.current.keyboardAlertMessage).toBeUndefined();
    },
  );
});
