import { act, renderHook } from '@testing-library/react-native';
import { useSourceAmountInput } from './index';
import { useABTest } from '../../../../../hooks';
import { playSelection } from '../../../../../util/haptics';
import { useTokenFiatRate } from '../useTokenFiatRate';

jest.mock('../../components/TokenInputArea', () => ({
  MAX_INPUT_LENGTH: 36,
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));
jest.mock('../../../../../hooks', () => ({
  useABTest: jest.fn(),
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
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBridgeControllerState: () => ({
    inputPrimaryDenomination: 'token_amount',
  }),
  selectDestToken: () => undefined,
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

const mockUseABTest = jest.mocked(useABTest);
const mockPlaySelection = jest.mocked(playSelection);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);

describe('useSourceAmountInput haptics', () => {
  it('plays selection haptic when toggling fiat mode under treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: { enableSwapHaptics: true },
      variantName: 'treatment',
      isActive: true,
    } as ReturnType<typeof useABTest>);
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
