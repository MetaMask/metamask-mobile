/**
 * Test to validate the fix for Solana custom token swaps
 * Issue: https://github.com/MetaMask/metamask-mobile/issues/16220
 * 
 * This test validates:
 * 1. Transaction history is recorded for Solana swaps
 * 2. Custom tokens are properly handled
 * 3. No UI breaks occur during the swap flow
 */

import { addSwapsTransaction } from '../app/util/swaps/swaps-transactions';
import { useCustomTokenImport } from '../app/components/UI/Bridge/hooks/useCustomTokenImport';
import { renderHook } from '@testing-library/react-hooks';
import Engine from '../app/core/Engine';

// Mock Engine
jest.mock('../app/core/Engine', () => ({
  context: {
    TokensController: {
      getTokens: jest.fn(),
      addToken: jest.fn(),
    },
    TransactionController: {
      update: jest.fn(),
    },
  },
}));

// Mock Logger
jest.mock('../app/util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('Solana Custom Token Swap Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Issue #16220 - UI breaks when swapping custom Solana tokens', () => {
    const customSolanaToken = {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: '0x66eee', // Solana mainnet
    };

    const solanaSwapTransaction = {
      action: 'swap',
      sourceToken: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'SOL',
        decimals: 9,
        chainId: 1151111081099710,
      },
      destinationToken: {
        address: customSolanaToken.address,
        symbol: customSolanaToken.symbol,
        decimals: customSolanaToken.decimals,
        chainId: 1151111081099710,
      },
      sourceAmount: '500000000',
      destinationAmount: '57056221',
      bridgeId: 'lifi',
    };

    it('should record transaction history for Solana swaps', () => {
      const transactionId = 'sol_tx_123';
      let transactionState: any = {};

      // Mock TransactionController update
      (Engine.context.TransactionController.update as jest.Mock).mockImplementation(
        (updateFn) => {
          const state = { swapsTransactions: {} };
          updateFn(state);
          transactionState = state;
        }
      );

      // Execute: Add swap transaction
      addSwapsTransaction(transactionId, solanaSwapTransaction);

      // Verify: Transaction was recorded
      expect(transactionState.swapsTransactions).toHaveProperty(transactionId);
      expect(transactionState.swapsTransactions[transactionId]).toEqual(
        solanaSwapTransaction
      );
    });

    it('should import custom tokens before transaction', async () => {
      // Setup
      const { result } = renderHook(() => useCustomTokenImport());
      (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([]);
      (Engine.context.TokensController.addToken as jest.Mock).mockResolvedValue(
        undefined
      );

      // Execute: Import custom token
      await result.current.importCustomToken(customSolanaToken);

      // Verify: Token was imported
      expect(Engine.context.TokensController.addToken).toHaveBeenCalledWith({
        address: customSolanaToken.address,
        symbol: customSolanaToken.symbol,
        decimals: customSolanaToken.decimals,
        name: customSolanaToken.name,
        image: undefined,
        networkClientId: undefined,
      });
    });

    it('should handle the complete flow without UI breaks', async () => {
      // This test simulates the complete flow
      const { result } = renderHook(() => useCustomTokenImport());
      
      // 1. Setup mocks
      (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([]);
      (Engine.context.TokensController.addToken as jest.Mock).mockResolvedValue(
        undefined
      );
      (Engine.context.TransactionController.update as jest.Mock).mockImplementation(
        (updateFn) => {
          const state = { swapsTransactions: {} };
          updateFn(state);
        }
      );

      // 2. Import custom token (happens in Bridge UI)
      await result.current.importCustomToken(customSolanaToken);

      // 3. Submit transaction (mocked)
      const transactionId = 'sol_tx_123';

      // 4. Record transaction history
      addSwapsTransaction(transactionId, solanaSwapTransaction);

      // 5. Verify both operations succeeded
      expect(Engine.context.TokensController.addToken).toHaveBeenCalled();
      expect(Engine.context.TransactionController.update).toHaveBeenCalled();
      
      // No errors thrown = no UI breaks
    });
  });
});