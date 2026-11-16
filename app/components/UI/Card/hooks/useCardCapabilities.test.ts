import { renderHook } from '@testing-library/react-native';
import { useCardCapabilities } from './useCardCapabilities';

const mockGetCapabilities = jest.fn();
let mockProviderId: string | null = 'immersve';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectCardActiveProviderId: () => mockProviderId,
  selectCardUserLocation: () => 'international',
  selectImmersveFundingChannelForSelectedCountry: () => ({
    fundingChannelId: 'money-channel',
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        getCapabilities: (...args: unknown[]) => mockGetCapabilities(...args),
      },
    },
  },
}));

describe('useCardCapabilities', () => {
  beforeEach(() => {
    mockProviderId = 'immersve';
    mockGetCapabilities.mockReset();
  });

  it('reads capabilities for the provider on screen', () => {
    mockGetCapabilities.mockReturnValue({
      reportsVerificationStatus: false,
      supportsMoneyAccountLinking: true,
    });

    const { result } = renderHook(() => useCardCapabilities());

    expect(mockGetCapabilities).toHaveBeenCalledWith('immersve');
    expect(result.current?.reportsVerificationStatus).toBe(false);
  });

  it('returns null when no provider is selected', () => {
    mockProviderId = null;

    const { result } = renderHook(() => useCardCapabilities());

    expect(result.current).toBeNull();
    expect(mockGetCapabilities).not.toHaveBeenCalled();
  });
});
