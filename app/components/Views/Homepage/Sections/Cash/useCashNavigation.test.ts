import { renderHook } from '@testing-library/react-native';
import { useCashNavigation } from './useCashNavigation';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHomeScreenEnabledFlag: jest.fn(),
}));

jest.mock('../../../../../reducers/user/selectors', () => ({
  selectMusdConversionEducationSeen: jest.fn(),
}));

import { useSelector } from 'react-redux';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';

const mockUseSelector = useSelector as jest.Mock;

const setupSelectors = ({
  isMoneyHomeEnabled = false,
  hasSeenEducation = false,
}: {
  isMoneyHomeEnabled?: boolean;
  hasSeenEducation?: boolean;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyHomeScreenEnabledFlag)
      return isMoneyHomeEnabled;
    if (selector === selectMusdConversionEducationSeen) return hasSeenEducation;
    return undefined;
  });
};

describe('useCashNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('navigateToCash', () => {
    it('navigates to education screen with Cash full view returnTo when education not seen', () => {
      setupSelectors({
        isMoneyHomeEnabled: false,
        hasSeenEducation: false,
      });

      const { result } = renderHook(() => useCashNavigation());
      result.current.navigateToCash();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          returnTo: { screen: Routes.WALLET.CASH_TOKENS_FULL_VIEW },
        },
      });
    });

    it('navigates to Cash full view when education already seen', () => {
      setupSelectors({
        isMoneyHomeEnabled: false,
        hasSeenEducation: true,
      });

      const { result } = renderHook(() => useCashNavigation());
      result.current.navigateToCash();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.CASH_TOKENS_FULL_VIEW,
        undefined,
      );
    });

    it('navigates to Money Home when isMoneyHomeEnabled and education already seen', () => {
      setupSelectors({
        isMoneyHomeEnabled: true,
        hasSeenEducation: true,
      });

      const { result } = renderHook(() => useCashNavigation());
      result.current.navigateToCash();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ROOT, {
        screen: Routes.MONEY.HOME,
      });
    });

    it('navigates to education screen with Money Home returnTo when isMoneyHomeEnabled and education not seen', () => {
      setupSelectors({
        isMoneyHomeEnabled: true,
        hasSeenEducation: false,
      });

      const { result } = renderHook(() => useCashNavigation());
      result.current.navigateToCash();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          returnTo: {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        },
      });
    });
  });

  describe('returned state', () => {
    it('exposes isMoneyHomeEnabled derived from the feature flag selector', () => {
      setupSelectors({ isMoneyHomeEnabled: true });

      const { result } = renderHook(() => useCashNavigation());

      expect(result.current.isMoneyHomeEnabled).toBe(true);
    });

    it('exposes hasSeenEducation derived from the user reducer selector', () => {
      setupSelectors({ hasSeenEducation: true });

      const { result } = renderHook(() => useCashNavigation());

      expect(result.current.hasSeenEducation).toBe(true);
    });
  });
});
