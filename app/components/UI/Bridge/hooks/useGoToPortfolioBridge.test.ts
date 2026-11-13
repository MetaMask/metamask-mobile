import { act, renderHook } from '@testing-library/react-native';
import useGoToPortfolioBridge from './useGoToPortfolioBridge';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'bridge' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: { browser: { tabs: never[] } }) => unknown) =>
    selector({ browser: { tabs: [] } }),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: () => '0x1',
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: mockAddProperties,
    }),
  }),
}));

jest.mock('../../../hooks/useBuildPortfolioUrl', () => ({
  useBuildPortfolioUrl: () => (baseUrl: string) => ({
    href: `${baseUrl}?token=1`,
  }),
}));

describe('useGoToPortfolioBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a bridge URL on the flat browser tab', () => {
    const { result } = renderHook(() =>
      useGoToPortfolioBridge('token_details'),
    );

    act(() => {
      result.current('0xabc');
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BROWSER.HOME,
      expect.objectContaining({
        newTabUrl: `${AppConstants.BRIDGE.URL}?token=1`,
        timestamp: expect.any(Number),
      }),
    );
  });
});
