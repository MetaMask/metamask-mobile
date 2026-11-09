import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { PersistedLocalMoneyFlow } from '../../../../core/redux/slices/moneyBalance';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  INGEST_LAG_MAX_AGE_MS,
  useMoneyAccountSweepstakesIngestLag,
} from './useMoneyAccountSweepstakesIngestLag';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

const NOW = 1_700_000_000_000;
const CONFIRMED_AT = NOW - 60_000;
const ACCOUNT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const OTHER_ADDRESS = '0x1234567890123456789012345678901234567890';

/**
 * Serves the stored marker and the active Money Account to the hook's two
 * selectors. The marker type is widened to cover the bare timestamp that
 * older builds persisted.
 */
const mockStoredFlow = (
  marker: PersistedLocalMoneyFlow | number | null,
  activeAddress: string | undefined,
) => {
  mockUseSelector.mockImplementation((selector) =>
    selector === selectPrimaryMoneyAccount
      ? activeAddress && { address: activeAddress }
      : marker,
  );
};

/** Stands in for a flow confirmed on the currently active Money Account. */
const mockConfirmedAt = (value: number | null) => {
  mockStoredFlow(
    value === null ? null : { address: ACCOUNT_ADDRESS, confirmedAt: value },
    ACCOUNT_ADDRESS,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useMoneyAccountSweepstakesIngestLag', () => {
  it('reports a lag when the ingest watermark predates the confirmed flow', () => {
    mockConfirmedAt(CONFIRMED_AT);

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(
        new Date(CONFIRMED_AT - 30_000).toISOString(),
      ),
    );

    expect(result.current.isIngestLagging).toBe(true);
  });

  it('clears the lag once the ingest has caught up to the flow', () => {
    mockConfirmedAt(CONFIRMED_AT);

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(
        new Date(CONFIRMED_AT + 30_000).toISOString(),
      ),
    );

    expect(result.current.isIngestLagging).toBe(false);
  });

  it('reports no lag when no local flow has been confirmed', () => {
    mockConfirmedAt(null);

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(new Date(NOW).toISOString()),
    );

    expect(result.current.isIngestLagging).toBe(false);
  });

  it.each([
    ['the field is absent on an older backend build', undefined],
    ['the ingest has never run', null],
    ['the watermark is unparseable', 'not-a-date'],
  ])('treats the figures as lagging when %s', (_case, dataAsOf) => {
    mockConfirmedAt(CONFIRMED_AT);

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(dataAsOf),
    );

    expect(result.current.isIngestLagging).toBe(true);
  });

  it('ignores a marker left by a different Money Account', () => {
    mockStoredFlow(
      { address: OTHER_ADDRESS, confirmedAt: CONFIRMED_AT },
      ACCOUNT_ADDRESS,
    );

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(
        new Date(CONFIRMED_AT - 30_000).toISOString(),
      ),
    );

    expect(result.current.isIngestLagging).toBe(false);
  });

  it('ignores the bare-timestamp marker persisted by older builds', () => {
    mockStoredFlow(CONFIRMED_AT, ACCOUNT_ADDRESS);

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(
        new Date(CONFIRMED_AT - 30_000).toISOString(),
      ),
    );

    expect(result.current.isIngestLagging).toBe(false);
  });

  it('reports no lag while no Money Account is active', () => {
    mockStoredFlow(
      { address: ACCOUNT_ADDRESS, confirmedAt: CONFIRMED_AT },
      undefined,
    );

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(
        new Date(CONFIRMED_AT - 30_000).toISOString(),
      ),
    );

    expect(result.current.isIngestLagging).toBe(false);
  });

  it('stops reporting a lag for a flow the ingest never caught up to', () => {
    mockConfirmedAt(NOW - INGEST_LAG_MAX_AGE_MS - 1);

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesIngestLag(
        new Date(NOW - INGEST_LAG_MAX_AGE_MS - 60_000).toISOString(),
      ),
    );

    expect(result.current.isIngestLagging).toBe(false);
  });
});
