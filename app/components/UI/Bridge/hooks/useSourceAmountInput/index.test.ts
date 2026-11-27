import { useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  FeatureId,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { useSourceAmountInput } from './index';
import { useSwapsFeatureId } from '../useSwapsFeatureId';
import { playSelection } from '../../../../../util/haptics';
import { useTokenFiatRate } from '../useTokenFiatRate';
import {
  formatFiatInputAmount,
  formatSecondaryTokenAmount,
  formatTokenInputAmountFromFiat,
} from '../../utils/sourceAmountInputMode';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { Keys } from '../../../../Base/Keypad/constants';

jest.mock('../../components/TokenInputArea', () => ({
  MAX_INPUT_LENGTH: 36,
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));
jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn(() => Promise.resolve()),
}));
jest.mock('../useTokenFiatRate', () => ({
  useTokenFiatRate: jest.fn(),
}));
jest.mock('../useSourceAmountCursor', () => ({
  useSourceAmountCursor: ({
    onSourceAmountChange,
  }: {
    onSourceAmountChange: (value: string | undefined) => void;
  }) => ({
    sourceSelection: { start: 0, end: 0 },
    handleSourceSelectionChange: jest.fn(),
    handleKeypadChange: ({ value }: { value: string }) => {
      onSourceAmountChange(value || undefined);
    },
    resetSourceAmountCursorPosition: jest.fn(),
    setSourceAmountCursorPositionToEnd: jest.fn(),
  }),
}));
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        setInputPrimaryDenomination: jest.fn(),
        trackUnifiedSwapBridgeEvent: jest.fn(),
      },
    },
  },
}));
const mockIsMaxSourceAmount = jest.fn(() => false);
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBridgeControllerState: () => ({
    inputPrimaryDenomination: 'token_amount',
  }),
  selectDestToken: () => undefined,
  selectIsMaxSourceAmount: () => mockIsMaxSourceAmount(),
}));
jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
}));
jest.mock('../../utils/sourceAmountInputMode', () => ({
  FIAT_INPUT_DECIMALS: 2,
  formatFiatInputAmount: jest.fn(() => '2000'),
  formatSecondaryTokenAmount: jest.fn((value: string) => value),
  formatTokenInputAmountFromFiat: jest.fn(() => '1'),
}));
jest.mock('../../utils/currencyUtils', () => ({
  formatCurrency: jest.fn(() => '$0'),
  getCurrencySymbol: jest.fn(() => '$'),
}));
jest.mock('../../utils/formatAmountWithLocaleSeparators', () => ({
  formatAmountWithLocaleSeparators: (value: string) => value,
}));
jest.mock('../useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

const mockUseSwapsFeatureId = jest.mocked(useSwapsFeatureId);

const mockPlaySelection = jest.mocked(playSelection);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);
const mockTrackUnifiedSwapBridgeEvent = jest.mocked(
  Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
);

describe('useSourceAmountInput haptics', () => {
  it('plays selection haptic when toggling fiat mode', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
    mockUseTokenFiatRate.mockReturnValue(2000);
    mockPlaySelection.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '1',
        sourceToken: {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'ETH',
          chainId: '0x1',
          decimals: 18,
        },
        onSourceAmountChange: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleToggle();
    });

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });
});

describe('useSourceAmountInput token fiat rate', () => {
  const sourceToken = {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    chainId: '0x1' as const,
    decimals: 18,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockUseTokenFiatRate.mockReturnValue(2000);
  });

  it('converts between fiat and token amounts at the rate it is given', () => {
    const { result } = renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '1',
        sourceToken,
        tokenFiatRate: 2500,
        onSourceAmountChange: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleToggle();
    });

    expect(result.current.fiatRate).toBe(2500);
    expect(formatFiatInputAmount).toHaveBeenCalledWith('1', 2500);
    expect(formatFiatInputAmount).not.toHaveBeenCalledWith('1', 2000);
  });

  it('converts at the polled token rate when given none', () => {
    const { result } = renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '1',
        sourceToken,
        onSourceAmountChange: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleToggle();
    });

    expect(result.current.fiatRate).toBe(2000);
    expect(formatFiatInputAmount).toHaveBeenCalledWith('1', 2000);
  });
});

describe('useSourceAmountInput analytics', () => {
  it('tracks the fiat toggle with the feature id of the flow using the input', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockUseTokenFiatRate.mockReturnValue(2000);
    mockPlaySelection.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '1',
        sourceToken: {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'ETH',
          chainId: '0x1',
          decimals: 18,
        },
        onSourceAmountChange: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleToggle();
    });

    expect(mockTrackUnifiedSwapBridgeEvent).toHaveBeenCalledWith(
      UnifiedSwapBridgeEventName.FiatCryptoToggleClicked,
      expect.objectContaining({
        feature_id: FeatureId.LIMIT_ORDER,
        money_account_action: undefined,
      }),
    );
  });
});

describe('useSourceAmountInput max amount', () => {
  const renderMaxHook = () =>
    renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: false,
        sourceAmount: '1.234567890123456789',
        sourceToken: {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'ETH',
          chainId: '0x1',
          decimals: 18,
        },
        onSourceAmountChange: jest.fn(),
      }),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(formatSecondaryTokenAmount).mockReturnValue('1.23456');
  });

  afterAll(() => {
    mockIsMaxSourceAmount.mockReturnValue(false);
    jest
      .mocked(formatSecondaryTokenAmount)
      .mockImplementation((value) => value);
  });

  it('shows the truncated amount and keeps the full amount for balance checks', () => {
    mockIsMaxSourceAmount.mockReturnValue(true);

    const { result } = renderMaxHook();

    expect(formatSecondaryTokenAmount).toHaveBeenCalledWith(
      '1.234567890123456789',
    );
    expect(result.current.amount).toBe('1.23456');
    expect(result.current.keypadValue).toBe('1.23456');
    expect(result.current.balanceCheckAmount).toBe('1.234567890123456789');
  });

  it('shows the full amount when the max flag is not set', () => {
    mockIsMaxSourceAmount.mockReturnValue(false);

    const { result } = renderMaxHook();

    expect(result.current.amount).toBe('1.234567890123456789');
  });
});

describe('useSourceAmountInput money token', () => {
  const moneySourceToken = {
    address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    symbol: 'MUSD',
    chainId: '0x8f' as const,
    decimals: 6,
    isMoneyToken: true,
  };

  const renderMoneyHook = () =>
    renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '10.25',
        sourceToken: moneySourceToken,
        onSourceAmountChange: jest.fn(),
      }),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
    mockUseTokenFiatRate.mockReturnValue(1);
    jest.mocked(formatTokenInputAmountFromFiat).mockReturnValue('1');
  });

  it('locks fiat mode and disables the fiat toggle', () => {
    const { result } = renderMoneyHook();

    expect(result.current.isFiatMode).toBe(true);
    expect(result.current.canToggle).toBe(false);
    expect(result.current.inputPrefix).toBe('$');
  });

  it('uses the money name as the secondary value', () => {
    const { result } = renderMoneyHook();

    expect(result.current.secondaryValue).toBe(strings('bridge.money_name'));
  });

  it('does not toggle away from fiat mode', () => {
    const { result } = renderMoneyHook();

    act(() => {
      result.current.handleToggle();
    });

    expect(mockPlaySelection).not.toHaveBeenCalled();
    expect(result.current.isFiatMode).toBe(true);
  });

  // Hook-local fiatAmount vs Redux sourceAmount. CV cannot observe this
  // without rendering BridgeMarketView and driving the keypad.
  it('shows the converted fiat amount from the redux source amount', () => {
    const { result } = renderMoneyHook();

    expect(formatFiatInputAmount).toHaveBeenCalledWith('10.25', 1);
    expect(result.current.amount).toBe('2000');
  });

  it('writes the token amount when a fiat rate arrives after typing', () => {
    const onSourceAmountChange = jest.fn();
    jest
      .mocked(formatTokenInputAmountFromFiat)
      .mockImplementation(({ tokenFiatRate, fiatAmount }) => {
        if (!tokenFiatRate || !fiatAmount) {
          return undefined;
        }

        return '10.25';
      });
    mockUseTokenFiatRate.mockReturnValue(undefined);

    const { result, rerender } = renderHook(
      ({ tokenFiatRate, sourceAmount }) =>
        useSourceAmountInput({
          isFiatToggleEnabled: true,
          sourceAmount,
          sourceToken: moneySourceToken,
          tokenFiatRate,
          onSourceAmountChange,
        }),
      {
        initialProps: {
          tokenFiatRate: undefined as number | undefined,
          sourceAmount: undefined as string | undefined,
        },
      },
    );

    act(() => {
      result.current.handleKeypadChange({
        value: '10.25',
        valueAsNumber: 10.25,
        pressedKey: Keys.Digit5,
      });
    });

    expect(onSourceAmountChange).toHaveBeenCalledWith(undefined);

    rerender({ tokenFiatRate: 1, sourceAmount: undefined });

    expect(onSourceAmountChange).toHaveBeenCalledWith('10.25');
  });
});

// The live rate ticks every few seconds, which CV cannot drive.
describe('useSourceAmountInput typed fiat amount', () => {
  const actualSourceAmountInputMode = jest.requireActual<
    typeof import('../../utils/sourceAmountInputMode')
  >('../../utils/sourceAmountInputMode');
  const sourceToken = {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    chainId: '0x1' as const,
    decimals: 18,
  };

  // The source amount lives in state, as in Redux, so the hook reads back
  // what it writes.
  const renderTypedFiatHook = (typedFiatRateTolerance?: number) =>
    renderHook(
      ({ tokenFiatRate }: { tokenFiatRate: number }) => {
        const [sourceAmount, setSourceAmount] = useState<string>();
        const input = useSourceAmountInput({
          isFiatToggleEnabled: true,
          sourceAmount,
          sourceToken,
          tokenFiatRate,
          typedFiatRateTolerance,
          onSourceAmountChange: setSourceAmount,
        });

        return { ...input, sourceAmount, setSourceAmount };
      },
      { initialProps: { tokenFiatRate: 2000 } },
    );

  const typeFiatAmount = (
    result: ReturnType<typeof renderTypedFiatHook>['result'],
    value: string,
  ) => {
    act(() => {
      result.current.handleToggle();
    });
    act(() => {
      result.current.handleKeypadChange({
        value,
        valueAsNumber: Number(value),
        pressedKey: Keys.Digit0,
      });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockUseTokenFiatRate.mockReturnValue(2000);
    jest
      .mocked(formatFiatInputAmount)
      .mockImplementation(actualSourceAmountInputMode.formatFiatInputAmount);
    jest
      .mocked(formatTokenInputAmountFromFiat)
      .mockImplementation(
        actualSourceAmountInputMode.formatTokenInputAmountFromFiat,
      );
  });

  afterAll(() => {
    jest.mocked(formatFiatInputAmount).mockImplementation(() => '2000');
    jest.mocked(formatTokenInputAmountFromFiat).mockImplementation(() => '1');
  });

  it('keeps the typed fiat amount and re-derives the token amount when the rate moves', () => {
    const { result, rerender } = renderTypedFiatHook(0);
    typeFiatAmount(result, '100');
    expect(result.current.sourceAmount).toBe('0.05');

    rerender({ tokenFiatRate: 2500 });

    expect(result.current.amount).toBe('100');
    expect(result.current.sourceAmount).toBe('0.04');
  });

  it('keeps the token amount while the rate stays within the tolerance', () => {
    const { result, rerender } = renderTypedFiatHook(0.005);
    typeFiatAmount(result, '100');

    rerender({ tokenFiatRate: 2008 });

    expect(result.current.amount).toBe('100');
    expect(result.current.sourceAmount).toBe('0.05');
  });

  it('re-derives the token amount once the rate drifts past the tolerance since it was last derived', () => {
    const { result, rerender } = renderTypedFiatHook(0.005);
    typeFiatAmount(result, '100.8');
    expect(result.current.sourceAmount).toBe('0.0504');

    rerender({ tokenFiatRate: 2008 });
    rerender({ tokenFiatRate: 2016 });

    expect(result.current.amount).toBe('100.8');
    expect(result.current.sourceAmount).toBe('0.05');
  });

  it('lets the fiat amount follow the rate when no tolerance is given', () => {
    const { result, rerender } = renderTypedFiatHook();
    typeFiatAmount(result, '100');

    rerender({ tokenFiatRate: 2500 });

    expect(result.current.amount).toBe('125');
    expect(result.current.sourceAmount).toBe('0.05');
  });

  it('lets the fiat amount follow the rate after a preset replaces the typed amount', () => {
    const { result, rerender } = renderTypedFiatHook(0);
    typeFiatAmount(result, '100');
    act(() => {
      result.current.syncFiatAmountToTokenAmount('0.5');
      result.current.setSourceAmount('0.5');
    });

    rerender({ tokenFiatRate: 2500 });

    expect(result.current.amount).toBe('1250');
    expect(result.current.sourceAmount).toBe('0.5');
  });

  it('lets the fiat amount follow the rate after toggling back to fiat', () => {
    const { result, rerender } = renderTypedFiatHook(0);
    typeFiatAmount(result, '100');
    act(() => {
      result.current.handleToggle();
    });
    act(() => {
      result.current.handleToggle();
    });

    rerender({ tokenFiatRate: 2500 });

    expect(result.current.amount).toBe('125');
    expect(result.current.sourceAmount).toBe('0.05');
  });

  it('does not refill a source amount cleared outside the input', () => {
    const { result, rerender } = renderTypedFiatHook(0);
    typeFiatAmount(result, '100');
    act(() => {
      result.current.setSourceAmount(undefined);
    });

    rerender({ tokenFiatRate: 2500 });

    expect(result.current.amount).toBeUndefined();
    expect(result.current.sourceAmount).toBeUndefined();
  });

  it('writes the token amount when a rate arrives after typing', () => {
    mockUseTokenFiatRate.mockReturnValue(undefined);
    const { result, rerender } = renderHook(
      ({ tokenFiatRate }: { tokenFiatRate: number | undefined }) => {
        const [sourceAmount, setSourceAmount] = useState<string>();
        const input = useSourceAmountInput({
          isFiatToggleEnabled: true,
          sourceAmount,
          sourceToken: { ...sourceToken, decimals: 6, isMoneyToken: true },
          tokenFiatRate,
          typedFiatRateTolerance: 0,
          onSourceAmountChange: setSourceAmount,
        });

        return { ...input, sourceAmount };
      },
      { initialProps: { tokenFiatRate: undefined as number | undefined } },
    );
    act(() => {
      result.current.handleKeypadChange({
        value: '10',
        valueAsNumber: 10,
        pressedKey: Keys.Digit0,
      });
    });
    expect(result.current.sourceAmount).toBeUndefined();

    rerender({ tokenFiatRate: 2 });

    expect(result.current.amount).toBe('10');
    expect(result.current.sourceAmount).toBe('5');
  });
});
