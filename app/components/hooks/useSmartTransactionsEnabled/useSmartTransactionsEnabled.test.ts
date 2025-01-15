import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useSmartTransactionsEnabled, { type RootState } from './useSmartTransactionsEnabled';

const mockSetFeatureFlag = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: RootState) => unknown) =>
    selector({
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: false,
            smartTransactionsMigrationApplied: false,
            featureFlags: {},
          },
        },
      },
    } as RootState),
  ),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setFeatureFlag: mockSetFeatureFlag,
    },
  },
}));

describe('useSmartTransactionsEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false for all flags when preferences are undefined', () => {
    const { result } = renderHook(() => useSmartTransactionsEnabled());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isMigrationApplied).toBe(false);
    expect(result.current.isBannerDismissed).toBe(false);
    expect(result.current.shouldShowBanner).toBe(false);
  });

  it('returns correct values when preferences exist', () => {
    (useSelector as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {
              smartTransactionsOptInStatus: true,
              smartTransactionsMigrationApplied: true,
              featureFlags: {
                smartTransactionsBannerDismissed: false,
              },
            },
          },
        },
      } as RootState),
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isMigrationApplied).toBe(true);
    expect(result.current.isBannerDismissed).toBe(false);
    expect(result.current.shouldShowBanner).toBe(true);
  });

  it('shouldShowBanner returns false when banner is dismissed', () => {
    (useSelector as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {
              smartTransactionsOptInStatus: true,
              smartTransactionsMigrationApplied: true,
              featureFlags: {
                smartTransactionsBannerDismissed: true,
              },
            },
          },
        },
      } as RootState),
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());
    expect(result.current.shouldShowBanner).toBe(false);
  });

  it('dismissBanner updates preferences through setFeatureFlag', async () => {
    const { result } = renderHook(() => useSmartTransactionsEnabled());
    await result.current.dismissBanner();

    expect(mockSetFeatureFlag).toHaveBeenCalledWith(
      'smartTransactionsBannerDismissed',
      true,
    );
  });
});
