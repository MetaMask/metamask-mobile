import {
  selectMultichainNetworkControllerState,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkName,
  selectSelectedNonEvmNativeCurrency,
  selectSelectedNonEvmNetworkSymbol,
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
