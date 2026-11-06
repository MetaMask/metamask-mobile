import { renderHook } from '@testing-library/react-native';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { isWatchOnlyAccount } from '../../../../../util/address';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useWatchOnlyAccountAlert } from './useWatchOnlyAccountAlert';

jest.mock('../../../../../util/address');
jest.mock('../useApprovalRequest');
jest.mock('../transactions/useTransactionPayingAccount');

const MISSING_TRANSLATION = /\[missing ".*" translation\]/;
const WATCH_ONLY_ADDRESS = '0x5972698398d8c5bbe67c0db74906236691020417';
const OWN_ADDRESS = '0x8dc623e964475d4d669da601fd15ea9125469003';

const EXPECTED_ALERT = {
  key: AlertKeys.WatchOnlyAccount,
  title: strings('watch_only.blocked_title'),
  message: strings('watch_only.blocked_message'),
  severity: Severity.Danger,
  isBlocking: true,
};

describe('useWatchOnlyAccountAlert', () => {
  const isWatchOnlyAccountMock = jest.mocked(isWatchOnlyAccount);
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const useTransactionPayingAccountMock = jest.mocked(
    useTransactionPayingAccount,
  );

  const setRequestFrom = (from?: string) => {
    useApprovalRequestMock.mockReturnValue({
      approvalRequest: from ? { requestData: { from } } : undefined,
    } as unknown as ReturnType<typeof useApprovalRequest>);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    isWatchOnlyAccountMock.mockImplementation(
      (address) => address === WATCH_ONLY_ADDRESS,
    );
    useTransactionPayingAccountMock.mockReturnValue(undefined as never);
    setRequestFrom(undefined);
  });

  it('blocks a transaction paid by a watch-only account', () => {
    useTransactionPayingAccountMock.mockReturnValue(
      WATCH_ONLY_ADDRESS as never,
    );

    const { result } = renderHook(() => useWatchOnlyAccountAlert());

    expect(result.current).toEqual([EXPECTED_ALERT]);
    expect(result.current[0].title).not.toMatch(MISSING_TRANSLATION);
    expect(result.current[0].message).not.toMatch(MISSING_TRANSLATION);
  });

  it('blocks a signature requested from a watch-only account', () => {
    setRequestFrom(WATCH_ONLY_ADDRESS);

    const { result } = renderHook(() => useWatchOnlyAccountAlert());

    expect(result.current).toEqual([EXPECTED_ALERT]);
  });

  it('returns no alert for an account that can sign', () => {
    setRequestFrom(OWN_ADDRESS);

    const { result } = renderHook(() => useWatchOnlyAccountAlert());

    expect(result.current).toEqual([]);
    expect(isWatchOnlyAccountMock).toHaveBeenCalledWith(OWN_ADDRESS);
  });

  it('returns no alert when the confirmation has no from address', () => {
    const { result } = renderHook(() => useWatchOnlyAccountAlert());

    expect(result.current).toEqual([]);
    expect(isWatchOnlyAccountMock).not.toHaveBeenCalled();
  });
});
