import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectPerpsSocialEnabledFlag } from '../selectors/featureFlags';
import { usePerpsSocialEnabled } from './usePerpsSocialEnabled';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockFlags = ({ perpsSocialEnabled }: { perpsSocialEnabled: boolean }) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsSocialEnabledFlag) {
      return perpsSocialEnabled;
    }
    return undefined;
  });
};

describe('usePerpsSocialEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when perpsSocialEnabled is on', () => {
    mockFlags({ perpsSocialEnabled: true });

    const { result } = renderHook(() => usePerpsSocialEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when perpsSocialEnabled is off', () => {
    mockFlags({ perpsSocialEnabled: false });

    const { result } = renderHook(() => usePerpsSocialEnabled());

    expect(result.current).toBe(false);
  });
});
