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
} from '../../utils/sourceAmountInputMode';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import Engine from '../../../../../core/Engine';

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
  useSourceAmountCursor: () => ({
    sourceSelection: { start: 0, end: 0 },
    handleSourceSelectionChange: jest.fn(),
    handleKeypadChange: jest.fn(),
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
  selectCurrentCurrency: jest.fn(() => 'usd'),
  selectCurrencyRates: jest.fn(() => undefined),
}));
jest.mock('../../utils/sourceAmountInputMode', () => ({
  FIAT_INPUT_DECIMALS: 2,
  formatFiatInputAmount: jest.fn(() => '2000'),
  formatSecondaryTokenAmount: jest.fn((value: string) => value),
  formatTokenInputAmountFromFiat: jest.fn(() => '1'),
}));
jest.mock('../../utils/currencyUtils', () => ({
  formatCurrency: jest.fn(() => '$0'),
  getCurrencySymbol: jest.fn((currency: string) =>
    currency.toLowerCase() === 'eur' ? '€' : '$',
  ),
}));
jest.mock('../../utils/formatAmountWithLocaleSeparators', () => ({
  formatAmountWithLocaleSeparators: (value: string) => value,
}));
jest.mock('../useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

const mockUseSwapsFeatureId = jest.mocked(useSwapsFeatureId);
const mockSelectCurrentCurrency = jest.mocked(selectCurrentCurrency);
const mockGetCurrencySymbol = jest.mocked(getCurrencySymbol);

const mockPlaySelection = jest.mocked(playSelection);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);
const mockTrackUnifiedSwapBridgeEvent = jest.mocked(
  Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
);

describe('useSourceAmountInput money source', () => {
  const moneySourceToken = {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    symbol: 'Money',
    chainId: '0x1' as const,
    decimals: 6,
    isMoneyToken: true,
  };

  beforeEach(() => {
    mockSelectCurrentCurrency.mockReturnValue('usd');
    mockGetCurrencySymbol.mockImplementation((currency: string) =>
      currency.toLowerCase() === 'eur' ? '€' : '$',
    );
  });

  it('prefixes the amount with the user currency symbol when the source token is Money', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
    mockUseTokenFiatRate.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '1.3',
        sourceToken: moneySourceToken,
        onSourceAmountChange: jest.fn(),
      }),
    );

    expect(mockGetCurrencySymbol).toHaveBeenCalledWith('usd');
    expect(result.current.inputPrefix).toBe('$');
    expect(result.current.canToggle).toBe(false);
    expect(result.current.isFiatMode).toBe(true);
    expect(result.current.amount).toBe('2000');
    expect(formatFiatInputAmount).toHaveBeenCalledWith('1.3', 1);
    expect(
      Engine.context.BridgeController.setInputPrimaryDenomination,
    ).toHaveBeenCalledWith('fiat_value');
  });

  it('prefixes the amount with € when the user currency is eur', () => {
    mockSelectCurrentCurrency.mockReturnValue('eur');
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
    mockUseTokenFiatRate.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useSourceAmountInput({
        isFiatToggleEnabled: true,
        sourceAmount: '1.3',
        sourceToken: moneySourceToken,
        onSourceAmountChange: jest.fn(),
      }),
    );

    expect(mockGetCurrencySymbol).toHaveBeenCalledWith('eur');
    expect(result.current.inputPrefix).toBe('€');
    expect(result.current.isFiatMode).toBe(true);
    expect(result.current.canToggle).toBe(false);
  });
});

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
      expect.objectContaining({ feature_id: FeatureId.LIMIT_ORDER }),
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
