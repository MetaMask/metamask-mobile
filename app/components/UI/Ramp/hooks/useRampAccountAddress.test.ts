jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {},
  },
}));

jest.mock('../../../../constants/network', () => ({
  NetworkType: {
    rpc: 'rpc',
  },
  RPC: 'rpc',
  NETWORKS_CHAIN_ID: {
    MAINNET: '1',
    LINEA_MAINNET: '59144',
  },
}));

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useRampAccountAddress from './useRampAccountAddress';
import { CaipChainId } from '@metamask/utils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { EthAccountType } from '@metamask/keyring-api';
import { AccountId } from '@metamask/accounts-controller';

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

const mockEvmAccount: InternalAccount = {
  id: 'evm-account-1' as AccountId,
  address: '0x1234567890123456789012345678901234567890',
  type: EthAccountType.Eoa,
  options: {},
  methods: [],
  scopes: ['eip155:1'],
  metadata: {
    name: 'EVM Account',
    importTime: Date.now(),
    keyring: {
      type: 'HD Key Tree',
    },
  },
};

const mockSolanaAccount: InternalAccount = {
  id: 'solana-account-1' as AccountId,
  address: 'SoLaNaAddress1234567890123456789012345678',
  type: 'solana:dataAccount' as InternalAccount['type'],
  options: {},
  methods: [],
  scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  metadata: {
    name: 'Solana Account',
    importTime: Date.now(),
    keyring: {
      type: 'Snap Keyring',
    },
  },
};

const mockBitcoinAccount: InternalAccount = {
  id: 'bitcoin-account-1' as AccountId,
  address: 'bc1qAddress1234567890123456789012345678',
  type: 'bip122:p2wpkh' as InternalAccount['type'],
  options: {},
  methods: [],
  scopes: ['bip122:000000000019d6689c085ae165831e93'],
  metadata: {
    name: 'Bitcoin Account',
    importTime: Date.now(),
    keyring: {
      type: 'Snap Keyring',
    },
  },
};

describe('useRampAccountAddress', () => {
  const mockState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);
  });

  it('returns null when caipChainId is null', () => {
    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(null),
      { state: mockState },
    );

    expect(result.current).toBeNull();
  });

  it('returns null when caipChainId is undefined', () => {
    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(undefined),
      { state: mockState },
    );

    expect(result.current).toBeNull();
  });

  it('returns EVM account address for CAIP EVM chainId', () => {
    const caipChainId: CaipChainId = 'eip155:1';

    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      (scope: string) => {
        if (scope === 'eip155:1') {
          return mockEvmAccount;
        }
        return undefined;
      },
    );

    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(caipChainId),
      { state: mockState },
    );

    expect(result.current).toBe(mockEvmAccount.address);
  });

  it('returns Solana account address for CAIP Solana chainId', () => {
    const caipChainId: CaipChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      (scope: string) => {
        if (scope === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
          return mockSolanaAccount;
        }
        return undefined;
      },
    );

    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(caipChainId),
      { state: mockState },
    );

    expect(result.current).toBe(mockSolanaAccount.address);
  });

  it('returns Bitcoin account address for CAIP Bitcoin chainId', () => {
    const caipChainId: CaipChainId = 'bip122:000000000019d6689c085ae165831e93';

    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      (scope: string) => {
        if (scope === 'bip122:000000000019d6689c085ae165831e93') {
          return mockBitcoinAccount;
        }
        return undefined;
      },
    );

    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(caipChainId),
      { state: mockState },
    );

    expect(result.current).toBe(mockBitcoinAccount.address);
  });

  it('returns null when no account supports the chainId', () => {
    const caipChainId: CaipChainId = 'eip155:999';

    mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);

    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(caipChainId),
      { state: mockState },
    );

    expect(result.current).toBeNull();
  });

  it('returns null when account exists but has no address', () => {
    const caipChainId: CaipChainId = 'eip155:1';

    const accountWithoutAddress = {
      ...mockEvmAccount,
      address: '',
    };

    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      () => accountWithoutAddress,
    );

    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(caipChainId),
      { state: mockState },
    );

    expect(result.current).toBeNull();
  });

  it('memoizes result when caipChainId does not change', () => {
    const caipChainId: CaipChainId = 'eip155:1';

    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      () => mockEvmAccount,
    );

    const { result } = renderHookWithProvider(
      () => useRampAccountAddress(caipChainId),
      { state: mockState },
    );

    const firstResult = result.current;
    expect(firstResult).toBe(mockEvmAccount.address);

    expect(result.current).toBe(firstResult);
    expect(result.current).toBe(mockEvmAccount.address);
  });

  it('updates result when caipChainId changes', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      (scope: string) => {
        if (scope === 'eip155:1') {
          return mockEvmAccount;
        }
        if (scope === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
          return mockSolanaAccount;
        }
        return undefined;
      },
    );

    const evmChainId: CaipChainId = 'eip155:1';
    const { result: evmResult } = renderHookWithProvider(
      () => useRampAccountAddress(evmChainId),
      { state: mockState },
    );

    expect(evmResult.current).toBe(mockEvmAccount.address);

    const solanaChainId: CaipChainId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const { result: solanaResult } = renderHookWithProvider(
      () => useRampAccountAddress(solanaChainId),
      { state: mockState },
    );

    expect(solanaResult.current).toBe(mockSolanaAccount.address);
  });
});
