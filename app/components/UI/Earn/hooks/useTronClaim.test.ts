import { act, renderHook } from '@testing-library/react-hooks';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import useTronClaim from './useTronClaim';
import { claimUnstakedTrx } from '../utils/tron-staking-snap';

const mockSelectSelectedInternalAccountByScope = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () =>
    mockSelectSelectedInternalAccountByScope,
}));

jest.mock('../utils/tron-staking-snap', () => ({
  claimUnstakedTrx: jest.fn(),
}));

describe('useTronClaim', () => {
  const mockClaimUnstakedTrx =
    claimUnstakedTrx as jest.MockedFunction<
      typeof claimUnstakedTrx
    >;

  const mockAccount: Partial<InternalAccount> = {
    id: 'tron-account-1',
    metadata: {
      name: 'Tron Account',
      snap: { id: 'npm:@metamask/tron-wallet-snap', name: 'Tron Wallet Snap', enabled: true },
      importTime: 0,
      keyring: { type: 'snap' },
      lastSelected: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSelectedInternalAccountByScope.mockReturnValue(mockAccount);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useTronClaim({ chainId: 'tron:728126428' }),
    );

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errors).toBeUndefined();
    expect(typeof result.current.handleClaim).toBe('function');
  });

  it('calls claimUnstakedTrx with correct params on handleClaim', async () => {
    mockClaimUnstakedTrx.mockResolvedValue({ valid: true });

    const { result } = renderHook(() =>
      useTronClaim({ chainId: 'tron:728126428' }),
    );

    await act(async () => {
      await result.current.handleClaim();
    });

    expect(mockClaimUnstakedTrx).toHaveBeenCalledWith(mockAccount, {
      fromAccountId: 'tron-account-1',
      assetId: 'tron:728126428/slip44:195',
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errors).toBeUndefined();
  });

  it('sets errors when claim returns errors', async () => {
    mockClaimUnstakedTrx.mockResolvedValue({
      valid: false,
      errors: ['Insufficient energy'],
    });

    const { result } = renderHook(() =>
      useTronClaim({ chainId: 'tron:728126428' }),
    );

    await act(async () => {
      await result.current.handleClaim();
    });

    expect(result.current.errors).toEqual(['Insufficient energy']);
  });

  it('sets errors when claim throws', async () => {
    mockClaimUnstakedTrx.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useTronClaim({ chainId: 'tron:728126428' }),
    );

    await act(async () => {
      await result.current.handleClaim();
    });

    expect(result.current.errors).toEqual(['Network error']);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does nothing when no account is selected', async () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(null);

    const { result } = renderHook(() =>
      useTronClaim({ chainId: 'tron:728126428' }),
    );

    await act(async () => {
      await result.current.handleClaim();
    });

    expect(mockClaimUnstakedTrx).not.toHaveBeenCalled();
  });
});
