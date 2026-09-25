import { renderHook } from '@testing-library/react-native';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { isWatchOnlyAccount } from '../../../../../util/address';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useWatchOnlyAccountAlert } from './useWatchOnlyAccountAlert';

jest.mock('../useApprovalRequest');
jest.mock('../transactions/useTransactionPayingAccount');
jest.mock('../../../../../util/address');

const PAYING_ADDRESS = '0xabc';
const APPROVAL_FROM_ADDRESS = '0xdef';

const EXPECTED_ALERT = {
  key: AlertKeys.WatchOnlyAccount,
  title: strings('alert_system.watch_only_account.title'),
  message: strings('alert_system.watch_only_account.message'),
  severity: Severity.Danger,
  isBlocking: true,
};

function runHook() {
  return renderHook(() => useWatchOnlyAccountAlert());
}

describe('useWatchOnlyAccountAlert', () => {
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const useTransactionPayingAccountMock = jest.mocked(
    useTransactionPayingAccount,
  );
  const isWatchOnlyAccountMock = jest.mocked(isWatchOnlyAccount);

  beforeEach(() => {
    jest.resetAllMocks();

    useApprovalRequestMock.mockReturnValue({
      approvalRequest: undefined,
    } as ReturnType<typeof useApprovalRequest>);
    useTransactionPayingAccountMock.mockReturnValue(undefined);
    isWatchOnlyAccountMock.mockReturnValue(false);
  });

  it('returns no alert when there is no signer address', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when the signer is not a watch-only account', () => {
    useTransactionPayingAccountMock.mockReturnValue(PAYING_ADDRESS);
    isWatchOnlyAccountMock.mockReturnValue(false);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns a blocking danger alert when the paying account is watch-only', () => {
    useTransactionPayingAccountMock.mockReturnValue(PAYING_ADDRESS);
    isWatchOnlyAccountMock.mockImplementation(
      (address) => address === PAYING_ADDRESS,
    );

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });

  it('falls back to the approval request from address when there is no paying account', () => {
    useTransactionPayingAccountMock.mockReturnValue(undefined);
    useApprovalRequestMock.mockReturnValue({
      approvalRequest: {
        requestData: { from: APPROVAL_FROM_ADDRESS },
      },
    } as unknown as ReturnType<typeof useApprovalRequest>);
    isWatchOnlyAccountMock.mockImplementation(
      (address) => address === APPROVAL_FROM_ADDRESS,
    );

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });

  it('prefers the paying account over the approval request from address', () => {
    useTransactionPayingAccountMock.mockReturnValue(PAYING_ADDRESS);
    useApprovalRequestMock.mockReturnValue({
      approvalRequest: {
        requestData: { from: APPROVAL_FROM_ADDRESS },
      },
    } as unknown as ReturnType<typeof useApprovalRequest>);

    runHook();

    expect(isWatchOnlyAccountMock).toHaveBeenCalledWith(PAYING_ADDRESS);
  });
});
