import { renderHook } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import {
  setWatchOnlyBuildEnv,
  withWatchOnlyBuildEnabled,
} from '../../../../../util/test/watchOnlyBuildEnv';
import { useWatchOnlyAccountAlert } from './useWatchOnlyAccountAlert';

const mockWatchOnlyAddress = '0x5972698398d8c5bbe67c0db74906236691020417';
jest.mock('../../../../../util/address', () => ({
  isWatchOnlyAccount: (address: string) => address === mockWatchOnlyAddress,
}));
jest.mock('../useApprovalRequest');
jest.mock('../transactions/useTransactionPayingAccount');

const WATCH_ONLY_ALERT = {
  key: AlertKeys.WatchOnlyAccount,
  title: strings('watch_only.blocked_title'),
  message: strings('watch_only.blocked_message'),
  severity: Severity.Danger,
  isBlocking: true,
};

function runHook(payingAccount?: Hex, requestFrom?: Hex) {
  jest.mocked(useTransactionPayingAccount).mockReturnValue(payingAccount);
  jest.mocked(useApprovalRequest).mockReturnValue({
    approvalRequest: { requestData: { from: requestFrom } },
  } as ReturnType<typeof useApprovalRequest>);
  return renderHook(() => useWatchOnlyAccountAlert()).result.current;
}

describe('useWatchOnlyAccountAlert', () => {
  withWatchOnlyBuildEnabled();

  it('blocks a transaction paid by a watch-only account', () => {
    const alerts = runHook(mockWatchOnlyAddress);

    expect(alerts).toEqual([WATCH_ONLY_ALERT]);
  });

  it('blocks a signature requested from a watch-only account', () => {
    const alerts = runHook(undefined, mockWatchOnlyAddress);

    expect(alerts).toEqual([WATCH_ONLY_ALERT]);
  });

  it('ignores signers on other keyrings, such as a Money Account withdraw', () => {
    const alerts = runHook('0x0000000000000000000000000000000000000002');

    expect(alerts).toEqual([]);
  });

  it.each([
    ['production', 'true'],
    ['dev', 'false'],
  ])('never alerts with METAMASK_ENVIRONMENT=%s and flag %s', (env, flag) => {
    setWatchOnlyBuildEnv(env, flag);

    const alerts = runHook(mockWatchOnlyAddress);

    expect(alerts).toEqual([]);
  });
});
