import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import { selectPerpsProModeEnabledFlag } from '../../selectors/featureFlags';
import { selectPerpsMode } from '../../selectors/perpsController';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsProModeEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the Pro mode flag is enabled and mode is Pro', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsProModeEnabledFlag) {
        return true;
      }
      if (selector === selectPerpsMode) {
        return PerpsMode.Pro;
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsProModeEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when the Pro mode flag is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsProModeEnabledFlag) {
        return false;
      }
      if (selector === selectPerpsMode) {
        return PerpsMode.Pro;
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsProModeEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when mode is Lite even if the Pro mode flag is enabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsProModeEnabledFlag) {
        return true;
      }
      if (selector === selectPerpsMode) {
        return PerpsMode.Lite;
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsProModeEnabled());

    expect(result.current).toBe(false);
  });
});
