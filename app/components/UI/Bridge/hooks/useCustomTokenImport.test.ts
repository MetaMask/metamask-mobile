import { renderHook } from '@testing-library/react-hooks';
import { useCustomTokenImport } from './useCustomTokenImport';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { BridgeToken } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokensController: {
      getTokens: jest.fn(),
      addToken: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('useCustomTokenImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSolanaToken: BridgeToken = {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: '0x66eee', // Solana mainnet as hex
    image: 'https://example.com/usdc.png',
  };

  const mockEthToken: BridgeToken = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: '0x1',
  };

  it('should import a new custom token successfully', async () => {
    const { result } = renderHook(() => useCustomTokenImport());
    
    // Mock no existing tokens
    (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([]);
    (Engine.context.TokensController.addToken as jest.Mock).mockResolvedValue(undefined);

    await result.current.importCustomToken(mockSolanaToken, 'solana-mainnet');

    expect(Engine.context.TokensController.addToken).toHaveBeenCalledWith({
      address: mockSolanaToken.address,
      symbol: mockSolanaToken.symbol,
      decimals: mockSolanaToken.decimals,
      name: mockSolanaToken.name,
      image: mockSolanaToken.image,
      networkClientId: 'solana-mainnet',
    });

    expect(Logger.log).toHaveBeenCalledWith(
      'Bridge Custom Token Import',
      'Custom token imported successfully',
      mockSolanaToken
    );
  });

  it('should skip import if token already exists', async () => {
    const { result } = renderHook(() => useCustomTokenImport());
    
    // Mock existing token
    (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([
      {
        address: mockSolanaToken.address.toLowerCase(),
        symbol: mockSolanaToken.symbol,
        decimals: mockSolanaToken.decimals,
        chainId: mockSolanaToken.chainId,
      },
    ]);

    await result.current.importCustomToken(mockSolanaToken, 'solana-mainnet');

    expect(Engine.context.TokensController.addToken).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      'Bridge Custom Token Import',
      'Token already exists, skipping import',
      mockSolanaToken
    );
  });

  it('should handle case-insensitive address comparison', async () => {
    const { result } = renderHook(() => useCustomTokenImport());
    
    // Mock existing token with uppercase address
    (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([
      {
        address: mockEthToken.address.toUpperCase(),
        symbol: mockEthToken.symbol,
        decimals: mockEthToken.decimals,
        chainId: mockEthToken.chainId,
      },
    ]);

    // Try to import with lowercase address
    const lowercaseToken = { ...mockEthToken, address: mockEthToken.address.toLowerCase() };
    await result.current.importCustomToken(lowercaseToken);

    expect(Engine.context.TokensController.addToken).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully without throwing', async () => {
    const { result } = renderHook(() => useCustomTokenImport());
    
    const error = new Error('Failed to add token');
    (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([]);
    (Engine.context.TokensController.addToken as jest.Mock).mockRejectedValue(error);

    // Should not throw
    await expect(
      result.current.importCustomToken(mockSolanaToken)
    ).resolves.not.toThrow();

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Bridge Custom Token Import: Failed to import custom token'
    );
  });

  it('should do nothing if no token is provided', async () => {
    const { result } = renderHook(() => useCustomTokenImport());
    
    await result.current.importCustomToken(null as any);

    expect(Engine.context.TokensController.getTokens).not.toHaveBeenCalled();
    expect(Engine.context.TokensController.addToken).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      'Bridge Custom Token Import',
      'No token to import'
    );
  });

  it('should import token without network client ID', async () => {
    const { result } = renderHook(() => useCustomTokenImport());
    
    (Engine.context.TokensController.getTokens as jest.Mock).mockResolvedValue([]);
    (Engine.context.TokensController.addToken as jest.Mock).mockResolvedValue(undefined);

    await result.current.importCustomToken(mockSolanaToken);

    expect(Engine.context.TokensController.addToken).toHaveBeenCalledWith({
      address: mockSolanaToken.address,
      symbol: mockSolanaToken.symbol,
      decimals: mockSolanaToken.decimals,
      name: mockSolanaToken.name,
      image: mockSolanaToken.image,
      networkClientId: undefined,
    });
  });
});