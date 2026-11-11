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
