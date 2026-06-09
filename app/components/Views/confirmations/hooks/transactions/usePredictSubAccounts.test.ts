import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { usePredictSubAccounts } from './usePredictSubAccounts';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(() => undefined),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getBalance: jest.fn(),
      getAccountState: jest.fn(),
    },
  },
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectInternalAccounts: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(),
  }),
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const EVM_ACCOUNT_1 = {
  id: 'acc-1',
  type: 'eip155:eoa',
  address: '0xabc',
};

const EVM_ACCOUNT_2 = {
  id: 'acc-2',
  type: 'eip155:eoa',
  address: '0xdef',
};

const NON_EVM_ACCOUNT = {
  id: 'acc-3',
  type: 'solana:account',
  address: 'SolAddr',
};

const GROUP_MAP: Record<string, { metadata?: { name?: string } }> = {
  'acc-1': { metadata: { name: 'Account 1' } },
  'acc-2': { metadata: { name: 'Account 2' } },
};

const BALANCE_DEFAULT = 150;

const ACCOUNT_STATE_DEFAULT = {
  address: '0xproxy123',
  isDeployed: true,
  walletType: 'safe' as const,
};

function setupSelectorMock(
  accounts = [EVM_ACCOUNT_1, EVM_ACCOUNT_2, NON_EVM_ACCOUNT],
  groupMap: Record<string, unknown> = GROUP_MAP,
) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectInternalAccounts) return accounts;
    if (selector === selectAccountToGroupMap) return groupMap;
    return undefined;
  });
}

describe('usePredictSubAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectorMock();
    (
      Engine.context.PredictController.getBalance as jest.Mock
    ).mockResolvedValue(BALANCE_DEFAULT);
    (
      Engine.context.PredictController.getAccountState as jest.Mock
    ).mockResolvedValue(ACCOUNT_STATE_DEFAULT);
  });

  it('filters to EVM accounts only', async () => {
    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts).toHaveLength(2);
    });

    expect(result.current.subAccounts.map((a) => a.id)).toEqual([
      '0xabc',
      '0xdef',
    ]);
  });

  it('builds sub-account names from group metadata', async () => {
    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts[0].name).toBe('Account 1 (Predict)');
    });

    expect(result.current.subAccounts[1].name).toBe('Account 2 (Predict)');
  });

  it('falls back to address when group metadata is missing', async () => {
    setupSelectorMock([EVM_ACCOUNT_1], {});

    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts[0].name).toBe('0xabc (Predict)');
    });
  });

  it('fetches balances and account state from PredictController', async () => {
    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts).toHaveLength(2);
    });

    expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
      address: '0xabc',
    });
    expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
      address: '0xdef',
    });
    expect(
      Engine.context.PredictController.getAccountState,
    ).toHaveBeenCalledWith({ ownerAddress: '0xabc' });
    expect(
      Engine.context.PredictController.getAccountState,
    ).toHaveBeenCalledWith({ ownerAddress: '0xdef' });
  });

  it('stores walletAddress from account state', async () => {
    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts[0].walletAddress).toBe('0xproxy123');
    });
  });

  it('auto-selects first account when fromAddress is not set', async () => {
    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.selectedSubAccount).not.toBeNull();
    });

    expect(result.current.selectedSubAccount?.id).toBe('0xabc');
  });

  it('returns empty array when no EVM accounts exist', async () => {
    setupSelectorMock([NON_EVM_ACCOUNT], {});

    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts).toHaveLength(0);
    });

    expect(result.current.selectedSubAccount).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    (
      Engine.context.PredictController.getBalance as jest.Mock
    ).mockRejectedValue(new Error('network error'));
    (
      Engine.context.PredictController.getAccountState as jest.Mock
    ).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts).toHaveLength(2);
    });
  });

  it('does not fetch when no EVM accounts', async () => {
    setupSelectorMock([], {});

    renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(
        Engine.context.PredictController.getBalance,
      ).not.toHaveBeenCalled();
    });
  });

  it('selects account matching transactionMeta.txParams.from', async () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      txParams: { from: '0xdef' },
    } as never);

    const { result } = renderHook(() => usePredictSubAccounts());

    await waitFor(() => {
      expect(result.current.subAccounts).toHaveLength(2);
    });

    expect(result.current.selectedSubAccount?.id).toBe('0xdef');
  });
});
