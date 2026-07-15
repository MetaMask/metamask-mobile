import { act, renderHook } from '@testing-library/react-hooks';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { useMusdConfirmNavigation } from './useMusdConfirmNavigation';
import { selectMoneyHubEnabledFlag } from '../../Money/selectors/featureFlags';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockGetParent = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
}));

const mockUseSelector = useSelector as jest.Mock;

const createParentState = (routeNames: string[]) => ({
  routes: routeNames.map((name) => ({ name, key: `${name}-key` })),
});

const setupMoneyHubEnabled = (enabled: boolean) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyHubEnabledFlag) return enabled;
    return undefined;
  });
};

describe('useMusdConfirmNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMoneyHubEnabled(false);
    mockGetParent.mockReturnValue({
      dispatch: mockDispatch,
      getState: mockGetState,
    });
  });

  describe('when Money Hub is enabled', () => {
    beforeEach(() => {
      setupMoneyHubEnabled(true);
    });

    it('pops the parent stack when CashTokensFullView is already below', () => {
      mockGetState.mockReturnValue(
        createParentState(['Home', Routes.WALLET.CASH_TOKENS_FULL_VIEW]),
      );

      const { result } = renderHook(() => useMusdConfirmNavigation());

      act(() => {
        result.current.navigateOnConfirm();
      });

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('replaces the current route with CashTokensFullView when it is not in the stack', () => {
      mockGetState.mockReturnValue(createParentState(['Home']));

      const { result } = renderHook(() => useMusdConfirmNavigation());

      act(() => {
        result.current.navigateOnConfirm();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.WALLET.CASH_TOKENS_FULL_VIEW),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('falls back to wallet view when parent navigation is unavailable', () => {
      mockGetParent.mockReturnValue(null);

      const { result } = renderHook(() => useMusdConfirmNavigation());

      act(() => {
        result.current.navigateOnConfirm();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });
  });

  describe('when Money Hub is disabled', () => {
    it('navigates to wallet view', () => {
      const { result } = renderHook(() => useMusdConfirmNavigation());

      act(() => {
        result.current.navigateOnConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
