import React, { createRef } from 'react';
import { initialState } from '../../_mocks_/initialState';
import { act, fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { TokenInputArea, TokenInputAreaRef, TokenInputAreaType } from '.';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_NATIVE_TOKEN } from '../../constants/assets';

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

// Mock Input to expose focus/blur/isFocused on its ref for imperative handle tests.
const mockInputFocus = jest.fn();
const mockInputBlur = jest.fn();
const mockInputIsFocused = jest.fn(() => false);
jest.mock(
  '../../../../../component-library/components/Form/TextField/foundation/Input',
  () => {
    const MockReact = jest.requireActual('react');
    const { TextInput } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: MockReact.forwardRef(
        (props: Record<string, unknown>, inputRef: React.Ref<unknown>) => {
          MockReact.useImperativeHandle(inputRef, () => ({
            focus: mockInputFocus,
            blur: mockInputBlur,
            isFocused: mockInputIsFocused,
          }));
          return MockReact.createElement(TextInput, {
            ...props,
            testID: props.testID,
          });
        },
      ),
    };
  },
);

jest.mock('../../hooks/useShouldRenderMaxOption', () => ({
  useShouldRenderMaxOption: jest.fn(() => true),
}));

jest.mock('../../hooks/useFormattedBalanceWithThreshold', () => ({
  useFormattedBalanceWithThreshold: jest.fn(() => '100'),
}));

jest.mock('../../hooks/useDisplayCurrencyValue', () => ({
  useDisplayCurrencyValue: jest.fn(() => '$100.00'),
}));

import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
const mockUseShouldRenderMaxOption =
  useShouldRenderMaxOption as jest.MockedFunction<
    typeof useShouldRenderMaxOption
  >;

import { useFormattedBalanceWithThreshold } from '../../hooks/useFormattedBalanceWithThreshold';
const mockUseFormattedBalanceWithThreshold =
  useFormattedBalanceWithThreshold as jest.MockedFunction<
    typeof useFormattedBalanceWithThreshold
  >;

import { useDisplayCurrencyValue } from '../../hooks/useDisplayCurrencyValue';
const mockUseDisplayCurrencyValue =
  useDisplayCurrencyValue as jest.MockedFunction<
    typeof useDisplayCurrencyValue
  >;

const mockOnTokenPress = jest.fn();
const mockOnFocus = jest.fn();
const mockOnBlur = jest.fn();
const mockOnInputPress = jest.fn();
const mockOnMaxPress = jest.fn();

describe('TokenInputArea', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShouldRenderMaxOption.mockReturnValue(true);
    mockUseFormattedBalanceWithThreshold.mockReturnValue('100');
    mockUseDisplayCurrencyValue.mockReturnValue('$100.00');
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

  it('applies source selection and forwards selection change', () => {
    const mockOnSelectionChange = jest.fn();
    const { getByTestId } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          selection={{ start: 2, end: 2 }}
          onSelectionChange={mockOnSelectionChange}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    const input = getByTestId('token-input-input');
    expect(input.props.selection).toEqual({ start: 2, end: 2 });

    fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 1, end: 1 } },
    });

    expect(mockOnSelectionChange).toHaveBeenCalled();
  });

  it('keeps destination selection pinned to start', () => {
    const { getByTestId } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Destination}
          selection={{ start: 3, end: 3 }}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    const input = getByTestId('token-input-input');
    expect(input.props.selection).toEqual({ start: 0, end: 0 });
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

    // Mock hook to return false since gasless is disabled for native token
    mockUseShouldRenderMaxOption.mockReturnValue(false);

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

    // Mock hook to return false since gasless is disabled for native Polygon token
    mockUseShouldRenderMaxOption.mockReturnValue(false);

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

  describe('Max button visibility with useShouldRenderMaxOption hook', () => {
    const nativeToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };
    const tokenBalance = '1.5';

    beforeEach(() => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);
    });

    afterEach(() => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);
    });

    it('does not display max button when useShouldRenderMaxOption returns false', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

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
        { state: initialState },
      );

      expect(queryByText('Max')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        nativeToken,
        tokenBalance,
        false,
      );
    });

    it('displays max button when useShouldRenderMaxOption returns true', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

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
        { state: initialState },
      );

      expect(getByText('Max')).toBeTruthy();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        nativeToken,
        tokenBalance,
        false,
      );
    });

    it('passes isQuoteSponsored to useShouldRenderMaxOption', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={nativeToken}
            tokenBalance={tokenBalance}
            onMaxPress={mockOnMaxPress}
            isQuoteSponsored
          />
        ),
        {
          name: 'TokenInputArea',
        },
        { state: initialState },
      );

      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        nativeToken,
        tokenBalance,
        true,
      );
    });

    it('does not display max button for destination token', () => {
      const { queryByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Destination}
            token={nativeToken}
            tokenBalance={tokenBalance}
            onMaxPress={mockOnMaxPress}
          />
        ),
        {
          name: 'TokenInputArea',
        },
        { state: initialState },
      );

      // Destination tokens never show max button
      expect(queryByText('Max')).toBeNull();
    });
  });

  describe('imperative handle (focus, blur, isFocused)', () => {
    beforeEach(() => {
      mockInputFocus.mockClear();
      mockInputBlur.mockClear();
      mockInputIsFocused.mockClear().mockReturnValue(false);
    });

    it('focus calls input focus and onFocus callback', () => {
      const ref = createRef<TokenInputAreaRef>();

      renderScreen(
        () => (
          <TokenInputArea
            ref={ref}
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

      act(() => {
        ref.current?.focus();
      });

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(mockOnFocus).toHaveBeenCalledTimes(1);
    });

    it('blur calls input blur and onBlur callback', () => {
      const ref = createRef<TokenInputAreaRef>();

      renderScreen(
        () => (
          <TokenInputArea
            ref={ref}
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

      act(() => {
        ref.current?.blur();
      });

      expect(mockInputBlur).toHaveBeenCalledTimes(1);
      expect(mockOnBlur).toHaveBeenCalledTimes(1);
    });

    it('isFocused returns the input focused state', () => {
      const ref = createRef<TokenInputAreaRef>();

      renderScreen(
        () => (
          <TokenInputArea
            ref={ref}
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
          />
        ),
        {
          name: 'TokenInputArea',
        },
        { state: initialState },
      );

      mockInputIsFocused.mockReturnValue(false);
      expect(ref.current?.isFocused()).toBe(false);

      mockInputIsFocused.mockReturnValue(true);
      expect(ref.current?.isFocused()).toBe(true);
    });

    it('focus and blur do not throw when onFocus/onBlur are not provided', () => {
      const ref = createRef<TokenInputAreaRef>();

      renderScreen(
        () => (
          <TokenInputArea
            ref={ref}
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
          />
        ),
        {
          name: 'TokenInputArea',
        },
        { state: initialState },
      );

      expect(() => {
        act(() => {
          ref.current?.focus();
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          ref.current?.blur();
        });
      }).not.toThrow();

      // Input methods were still called even without callbacks
      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(mockInputBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('currency value display', () => {
    const mockToken: BridgeToken = {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };

    it('shows currency value when token, amount > 0, and currencyValue are all provided', () => {
      // Arrange
      mockUseDisplayCurrencyValue.mockReturnValue('$50.00');

      // Act
      const { getByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={mockToken}
            amount="1"
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(getByText('$50.00')).toBeTruthy();
      expect(mockUseDisplayCurrencyValue).toHaveBeenCalledWith('1', mockToken);
    });

    it('hides currency value when amount is 0', () => {
      // Arrange
      mockUseDisplayCurrencyValue.mockReturnValue('$0.00');

      // Act
      const { queryByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={mockToken}
            amount="0"
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert — condition Number(amount) > 0 is false
      expect(queryByText('$0.00')).toBeNull();
    });

    it('hides currency value when amount is undefined', () => {
      // Act
      const { queryByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={mockToken}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(queryByText('$100.00')).toBeNull();
    });

    it('hides currency value when no token is provided', () => {
      // Act
      const { queryByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            amount="10"
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(queryByText('$100.00')).toBeNull();
    });

    it('passes amount and token to useDisplayCurrencyValue', () => {
      // Act
      renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={mockToken}
            amount="5"
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(mockUseDisplayCurrencyValue).toHaveBeenCalledWith('5', mockToken);
    });

    it('passes undefined amount and token when both omitted', () => {
      // Act
      renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(mockUseDisplayCurrencyValue).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  describe('token button vs select button', () => {
    const mockToken: BridgeToken = {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1' as `0x${string}`,
    };

    it('shows TokenButton with symbol when token is provided', () => {
      // Act
      const { getByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={mockToken}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(getByText('TEST')).toBeTruthy();
    });

    it('shows "Swap from" button when no token and isSourceToken is true', () => {
      // Act
      const { getByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            isSourceToken
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(getByText('Swap from')).toBeTruthy();
    });

    it('shows "Swap to" button when no token and isSourceToken is false', () => {
      // Act
      const { getByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Destination}
            isSourceToken={false}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(getByText('Swap to')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('does not render input when isLoading is true', () => {
      // Act
      const { queryByTestId } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            isLoading
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert — input replaced by Skeleton
      expect(queryByTestId('token-input-input')).toBeNull();
    });

    it('renders input when isLoading is false', () => {
      // Act
      const { getByTestId } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            isLoading={false}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(getByTestId('token-input-input')).toBeTruthy();
    });
  });

  describe('subtitle display', () => {
    it('source token shows formattedBalance as subtitle', () => {
      // Arrange
      mockUseFormattedBalanceWithThreshold.mockReturnValue('42.5 ETH');
      const mockToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        chainId: '0x1' as `0x${string}`,
      };

      // Act
      const { getByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            token={mockToken}
            tokenBalance="42.5"
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert
      expect(getByText('42.5 ETH')).toBeTruthy();
    });

    it('destination token shows formatted token address as subtitle', () => {
      // Arrange — use a non-native EVM token address
      const mockToken: BridgeToken = {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'USDC',
        decimals: 6,
        chainId: '0x1' as `0x${string}`,
      };

      // Act
      const { queryByText, getByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Destination}
            token={mockToken}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert — shows formatted address (0x1234...7890), not formattedBalance ('100')
      expect(queryByText('100')).toBeNull();
      expect(getByText(/0x.*\.\.\./)).toBeTruthy();
    });

    it('destination native token shows no address subtitle', () => {
      // Arrange — native (zero) address should produce no subtitle
      const nativeToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        chainId: '0x1' as `0x${string}`,
      };

      // Act
      const { queryByText } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Destination}
            token={nativeToken}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      // Assert — no formatted address rendered for native asset
      expect(queryByText(/0x.*\.\.\./)).toBeNull();
    });
  });

  describe('onInputPress callback', () => {
    it('fires onInputPress when the input is pressed', () => {
      // Act
      const { getByTestId } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            onInputPress={mockOnInputPress}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      fireEvent(getByTestId('token-input-input'), 'pressIn');

      // Assert
      expect(mockOnInputPress).toHaveBeenCalledTimes(1);
    });

    it('fires onInputPress on input focus', () => {
      // Act
      const { getByTestId } = renderScreen(
        () => (
          <TokenInputArea
            testID="token-input"
            tokenType={TokenInputAreaType.Source}
            onInputPress={mockOnInputPress}
            onFocus={mockOnFocus}
          />
        ),
        { name: 'TokenInputArea' },
        { state: initialState },
      );

      fireEvent(getByTestId('token-input-input'), 'focus');

      // Assert — both onFocus and onInputPress are fired
      expect(mockOnFocus).toHaveBeenCalledTimes(1);
      expect(mockOnInputPress).toHaveBeenCalledTimes(1);
    });
  });
});
