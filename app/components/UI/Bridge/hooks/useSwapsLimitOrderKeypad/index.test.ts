import { act, renderHook } from '@testing-library/react-native';
import { Keys, type KeypadChangeData } from '../../../../Base/Keypad';
import { useSourceAmountCursor } from '../useSourceAmountCursor';
import type { useSourceAmountInput } from '../useSourceAmountInput';
import { createMockToken } from '../../testUtils/fixtures';
import { useSwapsLimitOrderKeypad } from './index';

jest.mock('../useSourceAmountCursor', () => ({
  useSourceAmountCursor: jest.fn(),
}));

const mockUseSourceAmountCursor = jest.mocked(useSourceAmountCursor);

const mockHandleLimitPriceKeypadChange = jest.fn();
const mockHandleCustomPercentKeypadChange = jest.fn();
const mockHandleAmountKeypadChange = jest.fn();
const mockSetLimitPriceCursorToEnd = jest.fn();
const mockSetCustomPercentCursorToEnd = jest.fn();
const mockOnLimitPriceChange = jest.fn();
const mockOnCustomPercentChange = jest.fn();

const nativeToken = createMockToken({
  symbol: 'ETH',
  decimals: 18,
});

const sourceAmountInput: ReturnType<typeof useSourceAmountInput> = {
  amount: '1.5',
  balanceCheckAmount: '1.5',
  canToggle: false,
  handleFocus: jest.fn(),
  handleKeypadChange: mockHandleAmountKeypadChange,
  handleSelectionChange: jest.fn(),
  handleToggle: jest.fn(),
  inputPrefix: undefined,
  isFiatMode: false,
  keypadCurrency: 'ETH',
  keypadDecimals: 18,
  keypadValue: '1.5',
  resetToTokenMode: jest.fn(),
  secondaryValue: undefined,
  selection: undefined,
  syncFiatAmountToTokenAmount: jest.fn(),
};

function mockSourceAmountCursor() {
  mockUseSourceAmountCursor.mockImplementation(({ onSourceAmountChange }) => {
    if (onSourceAmountChange === mockOnLimitPriceChange) {
      return {
        sourceSelection: { start: 0, end: 1 },
        handleSourceSelectionChange: jest.fn(),
        handleKeypadChange: mockHandleLimitPriceKeypadChange,
        resetSourceAmountCursorPosition: jest.fn(),
        setSourceAmountCursorPositionToEnd: mockSetLimitPriceCursorToEnd,
      };
    }

    return {
      sourceSelection: { start: 0, end: 0 },
      handleSourceSelectionChange: jest.fn(),
      handleKeypadChange: mockHandleCustomPercentKeypadChange,
      resetSourceAmountCursorPosition: jest.fn(),
      setSourceAmountCursorPositionToEnd: mockSetCustomPercentCursorToEnd,
    };
  });
}

function renderKeypadHook(
  overrides: Partial<Parameters<typeof useSwapsLimitOrderKeypad>[0]> = {},
) {
  return renderHook(() =>
    useSwapsLimitOrderKeypad({
      customPercent: overrides.customPercent ?? '5',
      isLimitFiatMode: overrides.isLimitFiatMode ?? true,
      limitPrice: overrides.limitPrice ?? '100',
      nativeToken: overrides.nativeToken ?? nativeToken,
      onCustomPercentChange: mockOnCustomPercentChange,
      onLimitPriceChange: mockOnLimitPriceChange,
      sourceAmountInput: overrides.sourceAmountInput ?? sourceAmountInput,
    }),
  );
}

describe('useSwapsLimitOrderKeypad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSourceAmountCursor();
  });

  it('defaults to amount keypad focus', () => {
    const { result } = renderKeypadHook();

    expect(result.current.isAmountFocused).toBe(true);
    expect(result.current.isCustomPercentFocused).toBe(false);
    expect(result.current.keypadProps).toEqual({
      value: '1.5',
      currency: 'ETH',
      decimals: 18,
    });
  });

  it('opens the keypad when focusAmount is called', () => {
    const { result } = renderKeypadHook();
    const mockOpen = jest.fn();
    const mockClose = jest.fn();

    act(() => {
      result.current.keypadRef.current = {
        open: mockOpen,
        close: mockClose,
        isOpen: () => false,
      };
      result.current.focusAmount();
    });

    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(result.current.isAmountFocused).toBe(true);
  });

  it('moves cursor to end and focuses limit price input', () => {
    const { result } = renderKeypadHook({ limitPrice: '250' });
    const mockOpen = jest.fn();

    act(() => {
      result.current.keypadRef.current = {
        open: mockOpen,
        close: jest.fn(),
        isOpen: () => false,
      };
      result.current.focusLimitPrice();
    });

    expect(mockSetLimitPriceCursorToEnd).toHaveBeenCalledWith('250');
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(result.current.isAmountFocused).toBe(false);
    expect(result.current.keypadProps).toEqual({
      value: '250',
      currency: 'SWAPS_FIAT_INPUT',
      decimals: 18,
    });
  });

  it('moves cursor to end and focuses custom percent input', () => {
    const { result } = renderKeypadHook({ customPercent: '12' });
    const mockOpen = jest.fn();

    act(() => {
      result.current.keypadRef.current = {
        open: mockOpen,
        close: jest.fn(),
        isOpen: () => false,
      };
      result.current.focusCustomPercent();
    });

    expect(mockSetCustomPercentCursorToEnd).toHaveBeenCalledWith('12');
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(result.current.isCustomPercentFocused).toBe(true);
    expect(result.current.keypadProps).toEqual({
      value: '12',
      currency: 'LIMIT_ORDER_CUSTOM_PERCENT',
      decimals: 0,
      periodButtonProps: { isDisabled: true },
    });
  });

  it('routes keypad changes to the amount handler by default', () => {
    const { result } = renderKeypadHook();
    const keypadData: KeypadChangeData = {
      value: '2',
      valueAsNumber: 2,
      pressedKey: Keys.Digit2,
    };

    act(() => {
      result.current.handleChange(keypadData);
    });

    expect(mockHandleAmountKeypadChange).toHaveBeenCalledWith(keypadData);
  });

  it('routes keypad changes to the limit price handler when limit price is focused', () => {
    const { result } = renderKeypadHook();
    const keypadData: KeypadChangeData = {
      value: '101',
      valueAsNumber: 101,
      pressedKey: Keys.Digit1,
    };

    act(() => {
      result.current.focusLimitPrice();
    });

    act(() => {
      result.current.handleChange(keypadData);
    });

    expect(mockHandleLimitPriceKeypadChange).toHaveBeenCalledWith(keypadData);
  });

  it('routes keypad changes to the custom percent handler when custom percent is focused', () => {
    const { result } = renderKeypadHook();
    const keypadData: KeypadChangeData = {
      value: '15',
      valueAsNumber: 15,
      pressedKey: Keys.Digit5,
    };

    act(() => {
      result.current.focusCustomPercent();
    });

    act(() => {
      result.current.handleChange(keypadData);
    });

    expect(mockHandleCustomPercentKeypadChange).toHaveBeenCalledWith(
      keypadData,
    );
  });

  it('uses token decimals and symbol for token-mode limit price keypad props', () => {
    const { result } = renderKeypadHook({
      isLimitFiatMode: false,
      limitPrice: '0.05',
    });

    act(() => {
      result.current.focusLimitPrice();
    });

    expect(result.current.keypadProps).toEqual({
      value: '0.05',
      currency: 'ETH',
      decimals: 18,
    });
  });

  it('closes the keypad through the keypad ref', () => {
    const { result } = renderKeypadHook();
    const mockClose = jest.fn();

    act(() => {
      result.current.keypadRef.current = {
        open: jest.fn(),
        close: mockClose,
        isOpen: () => true,
      };
      result.current.close();
    });

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('exposes limit price and custom percent selection state', () => {
    const { result } = renderKeypadHook();

    expect(result.current.limitPriceSelection).toEqual({ start: 0, end: 1 });
    expect(result.current.customPercentSelection).toEqual({ start: 0, end: 0 });
  });
});
