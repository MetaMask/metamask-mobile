import { renderHook } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import useSmartTransactionsEnabled from './useSmartTransactionsEnabled';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
  useDispatch: jest.fn(),
}));

describe('useSmartTransactionsEnabled', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useSelector as jest.Mock).mockClear();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    mockDispatch.mockClear();
  });

  it('returns false for all flags when preferences are undefined', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {}
          }
        }
      })
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isMigrationApplied).toBe(false);
    expect(result.current.isBannerDismissed).toBe(false);
    expect(result.current.shouldShowBanner).toBe(false);
  });

  it('returns correct values when preferences exist', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {
              smartTransactionsOptInStatus: true,
              smartTransactionsMigrationApplied: true,
              smartTransactionsBannerDismissed: false,
            }
          }
        }
      })
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isMigrationApplied).toBe(true);
    expect(result.current.isBannerDismissed).toBe(false);
    expect(result.current.shouldShowBanner).toBe(true);
  });

  it('shouldShowBanner returns false when banner is dismissed', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {
              smartTransactionsOptInStatus: true,
              smartTransactionsMigrationApplied: true,
              smartTransactionsBannerDismissed: true,
            }
          }
        }
      })
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());
    expect(result.current.shouldShowBanner).toBe(false);
  });

  it('dismissBanner dispatches the correct action', () => {
    const { result } = renderHook(() => useSmartTransactionsEnabled());

    result.current.dismissBanner();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_SMART_TRANSACTIONS_BANNER_DISMISSED',
      payload: true,
    });
  });
});
