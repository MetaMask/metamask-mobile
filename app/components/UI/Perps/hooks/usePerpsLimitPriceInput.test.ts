import { act, renderHook } from '@testing-library/react-hooks';
import { strings } from '../../../../../locales/i18n';
import { usePerpsLimitPriceInput } from './usePerpsLimitPriceInput';
import { usePerpsLivePrices, usePerpsTopOfBook } from './stream';
import { usePerpsEventTracking } from './usePerpsEventTracking';

jest.mock('./stream', () => ({
  usePerpsLivePrices: jest.fn(),
  usePerpsTopOfBook: jest.fn(),
}));

jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;
const mockUsePerpsTopOfBook = usePerpsTopOfBook as jest.MockedFunction<
  typeof usePerpsTopOfBook
>;
const mockUsePerpsEventTracking = usePerpsEventTracking as jest.MockedFunction<
  typeof usePerpsEventTracking
>;

const TEST_IDS = {
  mid: 'preset-mid',
  bid: 'preset-bid',
  ask: 'preset-ask',
  percentPrefix: 'preset-percent-',
};

const mockTrack = jest.fn();

/**
 * Renders the hook with a controlled limit price so preset and keypad writes
 * can be asserted through `setLimitPrice`, the way both callers own the value.
 */
const renderLimitPriceInput = (
  overrides: Partial<Parameters<typeof usePerpsLimitPriceInput>[0]> = {},
) => {
  const setLimitPrice = jest.fn();
  const utils = renderHook(
    (props: Partial<Parameters<typeof usePerpsLimitPriceInput>[0]>) =>
      usePerpsLimitPriceInput({
        asset: 'BTC',
        currentPrice: 3000,
        direction: 'long',
        limitPrice: '',
        setLimitPrice,
        testIDs: TEST_IDS,
        ...overrides,
        ...props,
      }),
    { initialProps: {} },
  );

  return { ...utils, setLimitPrice };
};

describe('usePerpsLimitPriceInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsEventTracking.mockReturnValue({
      track: mockTrack,
    } as unknown as ReturnType<typeof usePerpsEventTracking>);
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { price: '3000', markPrice: '3000' },
    } as unknown as ReturnType<typeof usePerpsLivePrices>);
    mockUsePerpsTopOfBook.mockReturnValue({
      bestBid: '2999',
      bestAsk: '3001',
    } as unknown as ReturnType<typeof usePerpsTopOfBook>);
  });

  describe('live data subscriptions', () => {
    it('subscribes to the asset while enabled', () => {
      renderLimitPriceInput({ enabled: true });

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: ['BTC'] }),
      );
      expect(mockUsePerpsTopOfBook).toHaveBeenCalledWith({ symbol: 'BTC' });
    });

    it('drops both subscriptions while disabled', () => {
      renderLimitPriceInput({ enabled: false });

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: [] }),
      );
      expect(mockUsePerpsTopOfBook).toHaveBeenCalledWith({ symbol: '' });
    });

    it('falls back to the passed price when no live price has arrived', () => {
      mockUsePerpsLivePrices.mockReturnValue(
        {} as unknown as ReturnType<typeof usePerpsLivePrices>,
      );

      const { result } = renderLimitPriceInput({ currentPrice: 2500 });

      expect(result.current.currentPrice).toBe(2500);
    });
  });

  describe('presets', () => {
    it('labels the top-of-book preset Bid for a long order', () => {
      const { result } = renderLimitPriceInput({ direction: 'long' });

      expect(result.current.presets.map((preset) => preset.testID)).toEqual([
        TEST_IDS.mid,
        TEST_IDS.bid,
        `${TEST_IDS.percentPrefix}-1`,
        `${TEST_IDS.percentPrefix}-2`,
      ]);
    });

    it('labels the top-of-book preset Ask for a short order', () => {
      const { result } = renderLimitPriceInput({ direction: 'short' });

      expect(result.current.presets.map((preset) => preset.testID)).toEqual([
        TEST_IDS.mid,
        TEST_IDS.ask,
        `${TEST_IDS.percentPrefix}1`,
        `${TEST_IDS.percentPrefix}2`,
      ]);
    });

    it('writes the best bid when a long order takes top of book', () => {
      const { result, setLimitPrice } = renderLimitPriceInput({
        direction: 'long',
      });

      act(() => result.current.presets[1].onPress());

      expect(setLimitPrice).toHaveBeenCalledWith('2999');
    });

    it('writes the best ask when a short order takes top of book', () => {
      const { result, setLimitPrice } = renderLimitPriceInput({
        direction: 'short',
      });

      act(() => result.current.presets[1].onPress());

      expect(setLimitPrice).toHaveBeenCalledWith('3001');
    });

    it('falls back to the mid price when the book has no top of book', () => {
      mockUsePerpsTopOfBook.mockReturnValue(
        undefined as unknown as ReturnType<typeof usePerpsTopOfBook>,
      );

      const { result, setLimitPrice } = renderLimitPriceInput();

      act(() => result.current.presets[1].onPress());

      expect(setLimitPrice).toHaveBeenCalledWith('3000');
    });

    it('offsets the market price when a percentage preset is taken', () => {
      const { result, setLimitPrice } = renderLimitPriceInput({
        direction: 'long',
      });

      act(() => result.current.presets[2].onPress());

      expect(setLimitPrice).toHaveBeenCalledWith('2970');
    });

    it('keeps the preset list referentially stable across renders', () => {
      const { result, rerender } = renderLimitPriceInput();
      const firstPresets = result.current.presets;

      rerender({});

      expect(result.current.presets).toBe(firstPresets);
    });
  });

  describe('keypad entry', () => {
    it('writes a typed price through to the caller', () => {
      const { result, setLimitPrice } = renderLimitPriceInput();

      act(() =>
        result.current.handleKeypadChange({
          value: '3100',
          valueAsNumber: 3100,
        }),
      );

      expect(setLimitPrice).toHaveBeenCalledWith('3100');
    });

    it('ignores entry beyond the maximum digit count', () => {
      const { result, setLimitPrice } = renderLimitPriceInput();

      act(() =>
        result.current.handleKeypadChange({
          value: '1234567890',
          valueAsNumber: 1234567890,
        }),
      );

      expect(setLimitPrice).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('blocks a closing price outside the venue deviation band', () => {
      const { result } = renderLimitPriceInput({
        limitPrice: '10',
        isClosingPosition: true,
      });

      expect(result.current.exceedsMaxDeviation).toBe(true);
      expect(result.current.error).toBe(
        strings('perps.order.limit_price_modal.limit_price_too_far'),
      );
    });

    it('leaves the deviation band to the order form when opening', () => {
      const { result } = renderLimitPriceInput({
        limitPrice: '10',
        isClosingPosition: false,
      });

      expect(result.current.exceedsMaxDeviation).toBe(false);
      expect(result.current.error).not.toBe(
        strings('perps.order.limit_price_modal.limit_price_too_far'),
      );
    });

    it('warns when a closing long rests below market', () => {
      // Closing a long is a sell, so the order direction is short.
      const { result } = renderLimitPriceInput({
        limitPrice: '2900',
        direction: 'short',
        isClosingPosition: true,
      });

      expect(result.current.directionWarning).toBe(
        strings('perps.order.limit_price_modal.limit_price_below'),
      );
      expect(result.current.hasError).toBe(true);
    });

    it('reports no error for an untouched field', () => {
      const { result } = renderLimitPriceInput({
        limitPrice: '',
        isClosingPosition: true,
      });

      expect(result.current.error).toBe('');
      expect(result.current.hasError).toBe(false);
    });

    it('reports no error for a zero the field renders as empty', () => {
      const { result } = renderLimitPriceInput({
        limitPrice: '0',
        direction: 'short',
        isClosingPosition: true,
      });

      expect(result.current.error).toBe('');
    });
  });

  describe('input method tracking', () => {
    it('reports the input method once a price was entered', () => {
      const { result } = renderLimitPriceInput();

      act(() =>
        result.current.handleKeypadChange({
          value: '3100',
          valueAsNumber: 3100,
        }),
      );
      act(() => result.current.trackInputMethod());

      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ asset: 'BTC' }),
      );
    });

    it('stays silent when no price was entered', () => {
      const { result } = renderLimitPriceInput();

      act(() => result.current.trackInputMethod());

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('reports a given input method only once', () => {
      const { result } = renderLimitPriceInput();

      act(() =>
        result.current.handleKeypadChange({
          value: '3100',
          valueAsNumber: 3100,
        }),
      );
      act(() => result.current.trackInputMethod());
      act(() => result.current.trackInputMethod());

      expect(mockTrack).toHaveBeenCalledTimes(1);
    });

    it('discards a pending input method when the session is reset', () => {
      const { result } = renderLimitPriceInput();

      act(() =>
        result.current.handleKeypadChange({
          value: '3100',
          valueAsNumber: 3100,
        }),
      );
      act(() => result.current.resetInputMethod());
      act(() => result.current.trackInputMethod());

      expect(mockTrack).not.toHaveBeenCalled();
    });
  });
});
