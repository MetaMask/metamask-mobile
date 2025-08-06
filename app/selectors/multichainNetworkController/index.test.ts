import { CaipChainId } from '@metamask/utils';
import { BtcScope, EthScope, SolScope } from '@metamask/keyring-api';
import {
  selectMultichainNetworkControllerState,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkName,
  selectSelectedNonEvmNativeCurrency,
  selectSelectedNonEvmNetworkSymbol,
  getActiveNetworksByScopes,
} from './index';
import { RootState } from '../../reducers';

describe('Multichain Network Controller Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          multichainNetworkConfigurationsByChainId: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              name: 'Solana Mainnet',
              nativeCurrency: 'solana:sol/token:sol',
              ticker: 'SOL',
              decimals: 9,
            },
          },
        },
      },
    },
  } as unknown as RootState;

  describe('selectMultichainNetworkControllerState', () => {
    it('should return the multichain network controller state', () => {
      const result = selectMultichainNetworkControllerState(mockState);
      expect(result).toBe(
        mockState.engine.backgroundState.MultichainNetworkController,
      );
    });
  });

  describe('selectIsEvmNetworkSelected', () => {
    it('should return isEvmSelected value', () => {
      const result = selectIsEvmNetworkSelected(mockState);
      expect(result).toBe(true);
    });
  });

  describe('selectSelectedNonEvmNetworkChainId', () => {
    it('should return the selected non-EVM network chain ID', () => {
      const result = selectSelectedNonEvmNetworkChainId(mockState);
      expect(result).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });
  });

  describe('selectNonEvmNetworkConfigurationsByChainId', () => {
    it('should return the non-EVM network configurations', () => {
      const result = selectNonEvmNetworkConfigurationsByChainId(mockState);
      expect(result).toEqual(
        mockState.engine.backgroundState.MultichainNetworkController
          .multichainNetworkConfigurationsByChainId,
      );
    });
  });

  describe('selectSelectedNonEvmNetworkName', () => {
    it('should return the selected network name', () => {
      const result = selectSelectedNonEvmNetworkName(mockState);
      expect(result).toBe('Solana Mainnet');
    });

    it('should return undefined when network is not found', () => {
      const modifiedState = {
        ...mockState,
        engine: {
          backgroundState: {
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              selectedMultichainNetworkChainId: 'unknown:chain-id',
            },
          },
        },
      } as unknown as RootState;
      const result = selectSelectedNonEvmNetworkName(modifiedState);
      expect(result).toBeUndefined();
    });
  });

  describe('selectSelectedNonEvmNativeCurrency', () => {
    it('should return the selected network native currency', () => {
      const result = selectSelectedNonEvmNativeCurrency(mockState);
      expect(result).toBe('solana:sol/token:sol');
    });

    it('should return undefined when network is not found', () => {
      const modifiedState = {
        ...mockState,
        engine: {
          backgroundState: {
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              selectedMultichainNetworkChainId: 'unknown:chain-id',
            },
          },
        },
      } as unknown as RootState;
      const result = selectSelectedNonEvmNativeCurrency(modifiedState);
      expect(result).toBeUndefined();
    });
  });

  describe('selectSelectedNonEvmNetworkSymbol', () => {
    it('should return the selected network symbol', () => {
      const result = selectSelectedNonEvmNetworkSymbol(mockState);
      expect(result).toBe('SOL');
    });

    it('should return undefined when network symbol is not found', () => {
      const modifiedState = {
        ...mockState,
        engine: {
          backgroundState: {
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              selectedMultichainNetworkChainId: 'unknown:chain-id',
            },
          },
        },
      } as unknown as RootState;
      const result = selectSelectedNonEvmNetworkSymbol(modifiedState);
      expect(result).toBeUndefined();
    });
  });
});

describe('getActiveNetworksByScopes', () => {
  const MOCK_ETH_ACCOUNT = '0xS0M3FAk3ADDr355Dc8Ebf7A2152cdfB9D43FAk3';
  const MOCK_SOL_ACCOUNT = 'SoLaNaToTheMoonKopQixMzG9SMnKuCZQzQ9ujeZuvC5';
  const MOCK_BTC_ACCOUNT = '1BitcoinSatoshiNakamoto123456789';
  const MOCK_ETH_ACCOUNT_NO_ACTIVITY =
    '0xNoActivityAccount1234567890123456789012';
  const baseState = {
    engine: {
      backgroundState: {
        MultichainNetworkController: {
          networksWithTransactionActivity: {
            [MOCK_ETH_ACCOUNT.toLowerCase()]: {
              activeChains: ['0x1', '0x89'],
            },
            [MOCK_SOL_ACCOUNT]: {
              activeChains: [],
            },
            [MOCK_BTC_ACCOUNT]: {
              activeChains: [],
            },
          },
        },
      },
    },
  } as unknown as RootState;

  it('should return EVM networks with activity for an EOA account', () => {
    const account = {
      address: MOCK_ETH_ACCOUNT,
      scopes: [EthScope.Eoa],
    };
    const result = getActiveNetworksByScopes(baseState, account);
    expect(result).toEqual([
      {
        caipChainId: '0x1',
      },
      {
        caipChainId: '0x89',
      },
    ]);
  });

  it('should return Solana network for a Solana account', () => {
    const account = {
      address: MOCK_SOL_ACCOUNT,
      scopes: [SolScope.Mainnet],
    };
    const result = getActiveNetworksByScopes(baseState, account);
    expect(result).toEqual([
      {
        caipChainId: SolScope.Mainnet,
      },
    ]);
  });

  it.each(Object.values(BtcScope))(
    'should return correct network for Bitcoin: %s',
    (scope: BtcScope) => {
      const account = {
        address: MOCK_BTC_ACCOUNT,
        scopes: [scope],
      };
      const result = getActiveNetworksByScopes(baseState, account);
      expect(result).toEqual([
        {
          caipChainId: scope,
        },
      ]);
    },
  );

  it('should return an empty array if account has no scopes', () => {
    const account = {
      address: MOCK_ETH_ACCOUNT,
      scopes: [] as CaipChainId[],
    };
    const result = getActiveNetworksByScopes(baseState, account);
    expect(result).toEqual([]);
  });

  it('should return an empty array if account is undefined', () => {
    const result = getActiveNetworksByScopes(
      baseState,
      undefined as unknown as { address: string; scopes: CaipChainId[] },
    );
    expect(result).toEqual([]);
  });

  it('should return an empty array if no activity for EVM account', () => {
    const account = {
      address: MOCK_ETH_ACCOUNT_NO_ACTIVITY,
      scopes: [EthScope.Eoa],
    };
    const result = getActiveNetworksByScopes(baseState, account);
    expect(result).toEqual([]);
  });
});
