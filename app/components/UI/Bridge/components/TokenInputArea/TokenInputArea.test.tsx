import React from 'react';
import { initialState } from '../../_mocks_/initialState';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { TokenInputArea, TokenInputAreaType, getDisplayAmount } from '.';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_NATIVE_TOKEN } from '../../constants/assets';

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

const mockOnTokenPress = jest.fn();
const mockOnFocus = jest.fn();
const mockOnBlur = jest.fn();
const mockOnInputPress = jest.fn();
const mockOnMaxPress = jest.fn();

describe('TokenInputArea', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state', () => {
    const { getByTestId } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          onTokenPress={mockOnTokenPress}
          onFocus={mockOnFocus}
          onBlur={mockOnBlur}
          onInputPress={mockOnInputPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    expect(getByTestId('token-input-input')).toBeTruthy();
  });

  it('handles input focus and blur correctly', () => {
    const { getByTestId } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          onFocus={mockOnFocus}
          onBlur={mockOnBlur}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    const input = getByTestId('token-input-input');
    fireEvent(input, 'focus');
    expect(mockOnFocus).toHaveBeenCalled();

    fireEvent(input, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('displays max button for source token with balance and calls onMaxPress when clicked', () => {
    // Arrange
    const mockToken: BridgeToken = {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };
    const tokenBalance = '100.5';

    const { getByText } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          token={mockToken}
          tokenBalance={tokenBalance}
          onMaxPress={mockOnMaxPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    // Act
    const maxButton = getByText('Max');
    fireEvent.press(maxButton);

    // Assert
    expect(mockOnMaxPress).toHaveBeenCalledTimes(1);
  });

  it('does not display max button for destination token', () => {
    // Arrange
    const mockToken: BridgeToken = {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };
    const tokenBalance = '100.5';

    const { queryByText } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Destination}
          token={mockToken}
          tokenBalance={tokenBalance}
          onMaxPress={mockOnMaxPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    // Assert
    expect(queryByText('Max')).toBeNull();
  });

  it('does not display max button for native assets when gasless swaps are disabled', () => {
    // Arrange
    const nativeToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000', // AddressZero for native ETH
      symbol: 'ETH',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };
    const tokenBalance = '1.5';

    // Create state without gasless swap enabled
    const stateWithoutGasless = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ...initialState.engine.backgroundState.RemoteFeatureFlagController
                .remoteFeatureFlags,
              bridgeConfigV2: {
                ...initialState.engine.backgroundState
                  .RemoteFeatureFlagController.remoteFeatureFlags
                  .bridgeConfigV2,
                chains: {
                  ...initialState.engine.backgroundState
                    .RemoteFeatureFlagController.remoteFeatureFlags
                    .bridgeConfigV2.chains,
                  'eip155:1': {
                    ...initialState.engine.backgroundState
                      .RemoteFeatureFlagController.remoteFeatureFlags
                      .bridgeConfigV2.chains['eip155:1'],
                    isGaslessSwapEnabled: false,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { queryByText } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          token={nativeToken}
          tokenBalance={tokenBalance}
          onMaxPress={mockOnMaxPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: stateWithoutGasless },
    );

    // Assert
    expect(queryByText('Max')).toBeNull();
  });

  it('displays max button for native assets when gasless swaps are enabled', () => {
    // Arrange
    const nativeToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000', // AddressZero for native ETH
      symbol: 'ETH',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };
    const destToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001', // Different token on same chain
      symbol: 'TOKEN1',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };
    const tokenBalance = '1.5';

    // Create state with swap setup (both source and dest tokens on same chain)
    const stateWithSwap = {
      ...initialState,
      bridge: {
        ...initialState.bridge,
        sourceToken: nativeToken,
        destToken,
      },
    };

    const { getByText } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          token={nativeToken}
          tokenBalance={tokenBalance}
          onMaxPress={mockOnMaxPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: stateWithSwap },
    );

    // Assert
    expect(getByText('Max')).toBeTruthy();
  });

  it('treats Polygon native token as native asset after zero address conversion', () => {
    const polygonNativeToken: BridgeToken = {
      address: POLYGON_NATIVE_TOKEN, // 0x0000...001010
      symbol: 'POL',
      decimals: 18,
      chainId: CHAIN_IDS.POLYGON as `0x${string}`,
    };
    const tokenBalance = '10';

    const stateWithoutGasless = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ...initialState.engine.backgroundState.RemoteFeatureFlagController
                .remoteFeatureFlags,
              bridgeConfigV2: {
                ...initialState.engine.backgroundState
                  .RemoteFeatureFlagController.remoteFeatureFlags
                  .bridgeConfigV2,
                chains: {
                  ...initialState.engine.backgroundState
                    .RemoteFeatureFlagController.remoteFeatureFlags
                    .bridgeConfigV2.chains,
                  'eip155:137': {
                    isActiveSrc: true,
                    isActiveDest: true,
                    isGaslessSwapEnabled: false,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { queryByText } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          token={polygonNativeToken}
          tokenBalance={tokenBalance}
          onMaxPress={mockOnMaxPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: stateWithoutGasless },
    );

    // After conversion to zero address, Polygon native token is treated as native
    // Native tokens hide Max button when gasless swaps are disabled
    expect(queryByText('Max')).toBeNull();
  });

  it('displays max button for Polygon native token when gasless swaps are enabled', () => {
    const polygonNativeToken: BridgeToken = {
      address: POLYGON_NATIVE_TOKEN, // 0x0000...001010
      symbol: 'POL',
      decimals: 18,
      chainId: CHAIN_IDS.POLYGON as `0x${string}`,
    };
    const destToken: BridgeToken = {
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
      symbol: 'USDC',
      decimals: 6,
      chainId: CHAIN_IDS.POLYGON as `0x${string}`,
    };
    const tokenBalance = '10';

    const stateWithGaslessSwap = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ...initialState.engine.backgroundState.RemoteFeatureFlagController
                .remoteFeatureFlags,
              bridgeConfigV2: {
                ...initialState.engine.backgroundState
                  .RemoteFeatureFlagController.remoteFeatureFlags
                  .bridgeConfigV2,
                chains: {
                  ...initialState.engine.backgroundState
                    .RemoteFeatureFlagController.remoteFeatureFlags
                    .bridgeConfigV2.chains,
                  'eip155:137': {
                    isActiveSrc: true,
                    isActiveDest: true,
                    isGaslessSwapEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
      bridge: {
        ...initialState.bridge,
        sourceToken: polygonNativeToken,
        destToken,
      },
    };

    const { getByText } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          token={polygonNativeToken}
          tokenBalance={tokenBalance}
          onMaxPress={mockOnMaxPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: stateWithGaslessSwap },
    );

    // After conversion to zero address, Polygon native token is treated as native
    // Native tokens show Max button when gasless swaps are enabled
    expect(getByText('Max')).toBeTruthy();
  });
});

describe('getDisplayAmount', () => {
  it('returns undefined for undefined input', () => {
    expect(getDisplayAmount(undefined)).toBeUndefined();
  });

  it('preserves source amount when not from Max button', () => {
    const amount = '1.12345';
    expect(getDisplayAmount(amount, TokenInputAreaType.Source, false)).toBe(
      amount,
    );
  });

  it('truncates source amount to 5 decimals when from Max button', () => {
    const amount = '1.123456789';
    expect(getDisplayAmount(amount, TokenInputAreaType.Source, true)).toBe(
      '1.12345',
    );
  });

  it('truncates and formats max amount with many decimals', () => {
    const amount = '1234.567890123456789';
    expect(getDisplayAmount(amount, TokenInputAreaType.Source, true)).toBe(
      '1,234.56789',
    );
  });

  it('always truncates destination amount to 5 decimals', () => {
    const amount = '123.456789012345';
    expect(
      getDisplayAmount(amount, TokenInputAreaType.Destination, false),
    ).toBe('123.45678');
  });
});
