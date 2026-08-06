import { act } from 'react';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  CustomAmountStage,
  useCustomAmountStage,
} from './useCustomAmountStage';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayPrimaryRequiredToken,
  useTransactionPayQuotesLastUpdated,
  useTransactionPayQuotesRaw,
} from '../pay/useTransactionPayData';

jest.mock('../pay/useTransactionPayData');

const useIsTransactionPayQuoteLoadingMock = jest.mocked(
  useIsTransactionPayQuoteLoading,
);
const useTransactionPayQuotesRawMock = jest.mocked(useTransactionPayQuotesRaw);
const useTransactionPayQuotesLastUpdatedMock = jest.mocked(
  useTransactionPayQuotesLastUpdated,
);
const useTransactionPayPrimaryRequiredTokenMock = jest.mocked(
  useTransactionPayPrimaryRequiredToken,
);

interface StateOptions {
  isQuotesLoading?: boolean;
  quotes?: unknown[];
  quotesLastUpdated?: number | undefined;
  amountRaw?: string | undefined;
}

function setupState({
  isQuotesLoading = false,
  quotes = [],
  quotesLastUpdated = undefined,
  amountRaw = '1000',
}: StateOptions = {}) {
  useIsTransactionPayQuoteLoadingMock.mockReturnValue(isQuotesLoading);
  useTransactionPayQuotesRawMock.mockReturnValue(
    quotes as ReturnType<typeof useTransactionPayQuotesRaw>,
  );
  useTransactionPayQuotesLastUpdatedMock.mockReturnValue(quotesLastUpdated);
  useTransactionPayPrimaryRequiredTokenMock.mockReturnValue({
    amountRaw,
  } as ReturnType<typeof useTransactionPayPrimaryRequiredToken>);
}

type HookOptions = Parameters<typeof useCustomAmountStage>[0];

const DEFAULT_OPTIONS: HookOptions = {
  amountFiat: '10',
  disablePay: false,
  isAddMusdIntent: false,
  isDepositPrefillEnabled: false,
  isDepositPrefillLoading: false,
  skipDepositPrefill: false,
  hasAccountNoFunds: false,
};

// `renderHookWithProvider` does not thread `initialProps`/`rerender` props, so
// the hook reads its options from a mutable holder. `setOptions` updates the
// holder and re-renders so option changes can be exercised.
function runHook(options: Partial<HookOptions> = {}) {
  const props: { current: HookOptions } = {
    current: { ...DEFAULT_OPTIONS, ...options },
  };

  const view = renderHookWithProvider(
    () => useCustomAmountStage(props.current),
    { state: {} },
  );

  const setOptions = (next: Partial<HookOptions>) => {
    props.current = { ...props.current, ...next };
    view.rerender(undefined);
  };

  return { ...view, setOptions };
}

describe('useCustomAmountStage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupState();
  });

  describe('initial stage', () => {
    it('starts in AmountInput for a plain flow (no prefill, not add-mUSD)', () => {
      const { result } = runHook();

      expect(result.current.stage).toBe(CustomAmountStage.AmountInput);
      expect(result.current.isAmountUpdating).toBe(false);
    });

    it('starts in Loading for an add-mUSD intent', () => {
      const { result } = runHook({ isAddMusdIntent: true });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(true);
    });

    it('starts in Loading when deposit prefill is enabled', () => {
      const { result } = runHook({ isDepositPrefillEnabled: true });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
    });

    it('starts in AmountInput when prefill is enabled but skipped', () => {
      const { result } = runHook({
        isDepositPrefillEnabled: true,
        skipDepositPrefill: true,
      });

      expect(result.current.stage).toBe(CustomAmountStage.AmountInput);
    });
  });

  describe('derivation (no override)', () => {
    // The plain flow starts with an AmountInput override, so clear it first to
    // exercise the derive path.
    function runDerived(options: Partial<HookOptions> = {}) {
      const view = runHook(options);
      act(() => {
        view.result.current.setStage(null);
      });
      return view;
    }

    it('derives Loading while quotes are fetching', () => {
      setupState({ isQuotesLoading: true });

      const { result } = runDerived();

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(false);
    });

    it('derives ShowTotals once quotes are present', () => {
      setupState({ quotes: [{}], quotesLastUpdated: 1 });

      const { result } = runDerived();

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('keeps showing prefetched totals during a background quote refresh', () => {
      setupState({
        isQuotesLoading: true,
        quotes: [{}],
        quotesLastUpdated: 1,
      });

      const { result } = runDerived({ hasPrefetchedQuote: true });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('derives NoQuote when the fetch settled with no quotes', () => {
      setupState({ isQuotesLoading: false, quotes: [] });

      const { result } = runDerived();

      expect(result.current.stage).toBe(CustomAmountStage.NoQuote);
    });

    it('derives ShowTotals for a no-op route (raw no-op quote present)', () => {
      // Direct / no-op routes settle with a raw `strategy: None` quote that the
      // filtered selector strips. Reading raw quotes keeps the stage out of an
      // infinite loader.
      setupState({
        isQuotesLoading: false,
        quotes: [{ strategy: 'None' }],
        quotesLastUpdated: 1,
      });

      const { result } = runDerived();

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('derives Loading while a prefill result is awaited', () => {
      const { result } = runDerived({
        isDepositPrefillEnabled: true,
        isDepositPrefillLoading: true,
      });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(true);
    });
  });

  describe('add-mUSD loader', () => {
    it('holds Loading during the add-mUSD preload (initial override)', () => {
      // The add-mUSD initial override is Loading; it bridges the preload before
      // any fetch signal is reflected reactively.
      setupState({ isQuotesLoading: false, quotes: [] });

      const { result } = runHook({ isAddMusdIntent: true });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
    });

    it('derives NoQuote when the fetch settles with no quotes', () => {
      setupState({ isQuotesLoading: false, quotes: [] });

      const view = runHook({ isAddMusdIntent: true });
      act(() => {
        view.result.current.setStage(null);
      });

      // Regression: add-mUSD must not force an infinite loader once the fetch
      // has settled with no quotes.
      expect(view.result.current.stage).toBe(CustomAmountStage.NoQuote);
    });

    it('shows totals once a quote arrives', () => {
      setupState({ quotes: [{}], quotesLastUpdated: 1 });

      const view = runHook({ isAddMusdIntent: true });
      act(() => {
        view.result.current.setStage(null);
      });

      expect(view.result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });
  });

  describe('override behaviour', () => {
    it('honours a Loading override over the derived stage', () => {
      setupState({ quotes: [{}], quotesLastUpdated: 1 });

      const { result } = runHook();

      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(true);
    });

    it('keeps the current amount update active while an older quote request is loading', () => {
      setupState({ isQuotesLoading: true });
      const { result } = runHook();

      act(() => {
        result.current.beginAmountUpdate();
      });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(true);

      act(() => {
        result.current.endAmountUpdate();
      });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(false);
    });

    it('clears a Loading commit immediately when the current amount was prefetched', () => {
      setupState({
        isQuotesLoading: true,
        quotes: [{}],
        quotesLastUpdated: 1,
      });

      const { result } = runHook({ hasPrefetchedQuote: true });

      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('clears a no-op Loading re-commit immediately (amount unchanged)', () => {
      // Fetch has settled with quotes present, so once the override clears the
      // derived stage is ShowTotals.
      setupState({ quotes: [{}], quotesLastUpdated: 1 });

      const { result } = runHook();

      // First commit at '10' arms and records the amount.
      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });
      act(() => {
        result.current.setStage(null);
      });

      // Re-commit the same amount: the override is dropped straight away.
      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('holds the Loading override until the required token has an amount', () => {
      // Prefill flow: the override must not clear on an early loading pulse
      // before a real amount lands, otherwise the derive path flashes totals
      // from a stale quote.
      setupState({
        isQuotesLoading: true,
        quotes: [{}],
        quotesLastUpdated: 1,
        amountRaw: '0',
      });

      const { result, setOptions } = runHook({
        isDepositPrefillEnabled: true,
      });

      // Still Loading: hasAmount is false, so the override is retained.
      expect(result.current.stage).toBe(CustomAmountStage.Loading);

      // A real amount arrives with a fresh quote: the override may now clear.
      setupState({
        isQuotesLoading: false,
        quotes: [{}],
        quotesLastUpdated: 2,
        amountRaw: '1000',
      });
      act(() => {
        setOptions({});
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('leaves the Loading override once the quote fetch takes over', () => {
      const { result, setOptions } = runHook();

      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });

      // The real fetch starts with a real amount: derived Loading takes over,
      // so the override clears and the stage stays Loading via derivation.
      setupState({ isQuotesLoading: true, amountRaw: '1000' });
      act(() => {
        setOptions({});
      });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(false);
    });
  });

  describe('disablePay (direct transfer, no quotes)', () => {
    it('derives ShowTotals with no quotes present', () => {
      // A direct withdraw has no pay token and never fetches a quote, so the
      // derive path must show totals rather than fall through to NoQuote.
      setupState({ isQuotesLoading: false, quotes: [] });

      const view = runHook({ disablePay: true });
      act(() => {
        view.result.current.setStage(null);
      });

      expect(view.result.current.stage).toBe(CustomAmountStage.ShowTotals);
      expect(view.result.current.isAmountUpdating).toBe(false);
    });

    it('never derives NoQuote even after a settled empty fetch', () => {
      setupState({
        isQuotesLoading: false,
        quotes: [],
        quotesLastUpdated: 1,
      });

      const view = runHook({ disablePay: true });
      act(() => {
        view.result.current.setStage(null);
      });

      expect(view.result.current.stage).not.toBe(CustomAmountStage.NoQuote);
      expect(view.result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('keeps Loading until a direct-transfer amount commit resolves', () => {
      setupState({
        isQuotesLoading: false,
        quotes: [],
        amountRaw: undefined,
      });
      const { result } = runHook({ disablePay: true });

      act(() => {
        result.current.beginAmountUpdate();
      });

      expect(result.current.stage).toBe(CustomAmountStage.Loading);
      expect(result.current.isAmountUpdating).toBe(true);

      act(() => {
        result.current.endAmountUpdate();
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
      expect(result.current.isAmountUpdating).toBe(false);
    });

    it('settles the commit Loading override on the arm frame, with no quote and no resolved amount', () => {
      // Regression (device deadlock): a direct withdraw never fetches a quote
      // and its required-token amount may never resolve (missing fiat rate), so
      // `hasAmount` can stay false forever. The settle must happen on the arm
      // frame itself — the settle branch is never re-entered when no reactive
      // input changes. Reproduce that: no quote, no amount, no dep change.
      setupState({
        isQuotesLoading: false,
        quotes: [],
        quotesLastUpdated: undefined,
        amountRaw: undefined,
      });

      const { result } = runHook({ disablePay: true });

      // Commit the amount: handleDone sets the Loading override. Nothing else
      // changes afterwards (no quote, no amount), yet it must settle.
      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('settles a changed re-commit without any quote', () => {
      setupState({
        isQuotesLoading: false,
        quotes: [],
        amountRaw: undefined,
      });

      const { result, setOptions } = runHook({
        amountFiat: '5',
        disablePay: true,
      });

      // First commit settles on the arm frame.
      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });
      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);

      // Edit the amount and re-commit: re-arms and settles again immediately.
      act(() => {
        setOptions({ amountFiat: '10' });
        result.current.setStage(CustomAmountStage.Loading);
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });

    it('settles an identical re-commit without any quote', () => {
      setupState({ isQuotesLoading: false, quotes: [], amountRaw: undefined });

      const { result } = runHook({ amountFiat: '5', disablePay: true });

      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });
      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);

      // Re-commit the same amount: still settles (no-op re-commit OR disablePay).
      act(() => {
        result.current.setStage(CustomAmountStage.Loading);
      });

      expect(result.current.stage).toBe(CustomAmountStage.ShowTotals);
    });
  });

  describe('skip-prefill re-assert', () => {
    it('re-asserts AmountInput when prefill becomes enabled-but-skipped', () => {
      const { result, setOptions } = runHook({
        isDepositPrefillEnabled: true,
        skipDepositPrefill: false,
      });

      // Starts in Loading (prefill expected).
      expect(result.current.stage).toBe(CustomAmountStage.Loading);

      act(() => {
        setOptions({ skipDepositPrefill: true });
      });

      expect(result.current.stage).toBe(CustomAmountStage.AmountInput);
    });
  });
});
