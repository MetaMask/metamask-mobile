import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  INGEST_LAG_MAX_AGE_MS,
  useMoneyAccountSweepstakesIngestLag,
} from './useMoneyAccountSweepstakesIngestLag';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

const NOW = 1_700_000_000_000;
const CONFIRMED_AT = NOW - 60_000;

/** Stands in for the last locally-confirmed Money flow in the store. */
const mockConfirmedAt = (value: number | null) => {
  mockUseSelector.mockReturnValue(value);
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
