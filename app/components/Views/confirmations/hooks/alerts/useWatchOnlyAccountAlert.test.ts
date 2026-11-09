import { renderHook } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useWatchOnlyAccountAlert } from './useWatchOnlyAccountAlert';

const mockWatchOnlyAddress = '0x5972698398d8c5bbe67c0db74906236691020417';
jest.mock('../../../../../util/address', () => ({
  isWatchOnlyAccount: (address: string) => address === mockWatchOnlyAddress,
}));
jest.mock('../useApprovalRequest');
jest.mock('../transactions/useTransactionPayingAccount');

const originalEnv = { ...process.env };

function runHook(payingAccount?: Hex, requestFrom?: Hex) {
  jest.mocked(useTransactionPayingAccount).mockReturnValue(payingAccount);
  jest.mocked(useApprovalRequest).mockReturnValue({
    approvalRequest: { requestData: { from: requestFrom } },
  } as ReturnType<typeof useApprovalRequest>);
  return renderHook(() => useWatchOnlyAccountAlert()).result.current;
}

describe('useWatchOnlyAccountAlert', () => {
  beforeEach(() => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'true';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('blocks a transaction paid by a watch-only account', () => {
    expect(runHook(mockWatchOnlyAddress)).toEqual([
      {
        key: AlertKeys.WatchOnlyAccount,
        title: strings('watch_only.blocked_title'),
        message: strings('watch_only.blocked_message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('blocks a signature requested from a watch-only account', () => {
    expect(runHook(undefined, mockWatchOnlyAddress)).toHaveLength(1);
  });

  it('ignores signers on other keyrings, such as a Money Account withdraw', () => {
    expect(runHook('0x0000000000000000000000000000000000000002')).toEqual([]);
  });

  it.each([
    ['production', 'true'],
    ['dev', 'false'],
  ])('never alerts with METAMASK_ENVIRONMENT=%s and flag %s', (env, flag) => {
    process.env.METAMASK_ENVIRONMENT = env;
    process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = flag;

    expect(runHook(mockWatchOnlyAddress)).toEqual([]);
  });
});
