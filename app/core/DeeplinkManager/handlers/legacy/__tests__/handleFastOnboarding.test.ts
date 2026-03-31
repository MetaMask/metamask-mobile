import handleFastOnboarding from '../handleFastOnboarding';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import ReduxService, { ReduxStore } from '../../../../redux';
import { NavigationContainerRef } from '@react-navigation/native';

describe('handleFastOnboarding', () => {
  let mockReset: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockGetState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReset = jest.fn();
    mockNavigate = jest.fn();
    mockGetState = jest.fn();

    // Mock NavigationService
    jest.spyOn(NavigationService, 'navigation', 'get').mockReturnValue({
      reset: mockReset,
      navigate: mockNavigate,
    } as unknown as NavigationContainerRef);

    // Mock ReduxService
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: mockGetState,
    } as unknown as ReduxStore);
  });
  describe('valid onboarding types', () => {
    it.each(['google', 'apple', 'srp'] as const)(
      'navigates to onboarding flow for %s type and returns true',
      (onboardingType) => {
        // Arrange
        const deeplink = `?type=${onboardingType}`;
        mockGetState.mockReturnValue({ user: { existingUser: false } });

        // Act
        const result = handleFastOnboarding({ onboardingPath: deeplink });

        // Assert
        expect(result).toBe(true);
        expect(mockGetState).toHaveBeenCalled();
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: Routes.ONBOARDING.ROOT_NAV,
              params: {
                screen: Routes.ONBOARDING.NAV,
                params: {
                  screen: Routes.ONBOARDING.ONBOARDING,
                  params: {
                    onboardingType,
                    existing: '',
                  },
                },
              },
            },
          ],
        });
      },
    );

    it('handles additional query parameters and existing param', () => {
      // Arrange
      const deeplink = `?foo=bar&type=google&existing=true&baz=qux`;
      mockGetState.mockReturnValue({ user: { existingUser: false } });

      // Act
      const result = handleFastOnboarding({ onboardingPath: deeplink });

      // Assert
      expect(result).toBe(true);
      expect(mockGetState).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.ONBOARDING,
                params: { onboardingType: 'google', existing: 'true' },
              },
            },
          },
        ],
      });
    });
  });

  describe('existing user scenarios', () => {
    it('navigates to WALLET.HOME when existing is true', () => {
      // Arrange
      const deeplink = `?type=google&existing=true&foo=bar`;
      mockGetState.mockReturnValue({ user: { existingUser: true } });

      // Act
      const result = handleFastOnboarding({ onboardingPath: deeplink });

      // Assert
      expect(result).toBe(true);
      expect(mockGetState).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  describe('invalid or missing type parameter', () => {
    it.each([
      `?`,
      `?foo=bar`,
      `?type=`,
      `?type&foo=bar`,
      `?type=invalid`,
      `?type=facebook`,
    ])('returns false and does not navigate for: %s', (deeplink) => {
      // Arrange
      mockGetState.mockReturnValue({ user: { existingUser: false } });

      // Act
      const result = handleFastOnboarding({ onboardingPath: deeplink });

      // Assert
      expect(mockGetState).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('ReduxService error handling', () => {
    it('throws error when ReduxService.store.getState throws an error', () => {
      // Arrange
      const deeplink = `/onboarding?type=google`;
      mockGetState.mockImplementation(() => {
        throw new Error('Redux store error');
      });

      // Act & Assert
      expect(() => handleFastOnboarding({ onboardingPath: deeplink })).toThrow(
        'Redux store error',
      );
    });
  });

  describe('URL parsing edge cases', () => {
    it('handles empty string and malformed paths', () => {
      // Arrange
      const emptyPath = '';
      const malformedPath = '//onboarding?type=apple';
      mockGetState.mockReturnValue({ user: { existingUser: false } });

      // Act & Assert
      expect(handleFastOnboarding({ onboardingPath: emptyPath })).toBe(false);
      expect(handleFastOnboarding({ onboardingPath: malformedPath })).toBe(
        true,
      );
      expect(mockGetState).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation service edge cases', () => {
    it('return false when navigation service has missing methods', () => {
      // Arrange
      jest
        .spyOn(NavigationService, 'navigation', 'get')
        .mockReturnValue(null as unknown as NavigationContainerRef);
      const deeplink = `/onboarding?type=google`;
      mockGetState.mockReturnValue({ user: { existingUser: false } });

      // Act & Assert
      expect(handleFastOnboarding({ onboardingPath: deeplink })).toBe(false);
    });
  });
});
