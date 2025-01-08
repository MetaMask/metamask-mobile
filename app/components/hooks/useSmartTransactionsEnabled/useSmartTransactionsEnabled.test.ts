import { renderHook } from '@testing-library/react-hooks';
import useSmartTransactionsEnabled from './useSmartTransactionsEnabled';
import { useSelector } from 'react-redux';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

describe('useSmartTransactionsEnabled', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockClear();
  });

  it('returns false for both flags when preferences are undefined', () => {
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
  });

  it('returns correct values when preferences exist', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {
              smartTransactionsOptInStatus: true,
              smartTransactionsMigrationApplied: true,
            }
          }
        }
      })
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isMigrationApplied).toBe(true);
  });

  it('handles when only one preference is set', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        engine: {
          backgroundState: {
            PreferencesController: {
              smartTransactionsOptInStatus: true,
              smartTransactionsMigrationApplied: false,
            }
          }
        }
      })
    );

    const { result } = renderHook(() => useSmartTransactionsEnabled());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isMigrationApplied).toBe(false);
  });
});
