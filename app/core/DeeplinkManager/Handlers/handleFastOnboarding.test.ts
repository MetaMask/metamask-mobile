import handleFastOnboarding from './handleFastOnboarding';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../AppConstants';
import { NavigationContainerRef } from '@react-navigation/native';

const { MM_IO_UNIVERSAL_LINK_HOST } = AppConstants;

describe('handleFastOnboarding', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    jest.spyOn(NavigationService, 'navigation', 'get').mockReturnValue({
      navigate: mockNavigate,
    } as unknown as NavigationContainerRef);
  });
  describe('valid onboarding types', () => {
    it.each(['google', 'apple', 'import_srp'] as const)(
      'navigates to onboarding flow for %s type and returns true',
      (onboardingType) => {
        // Arrange
        const deeplink = `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=${onboardingType}`;

        // Act
        const result = handleFastOnboarding(deeplink);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith({
          name: Routes.ONBOARDING.ROOT_NAV,
          params: {
            screen: Routes.ONBOARDING.NAV,
            params: {
              screen: Routes.ONBOARDING.ONBOARDING,
              params: { onboardingType },
            },
          },
        });
        expect(result).toBe(true);
      },
    );

    it('works with additional query parameters', () => {
      // Arrange
      const deeplink =
        'https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?foo=bar&type=google&baz=qux';

      // Act
      const result = handleFastOnboarding(deeplink);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith({
        name: Routes.ONBOARDING.ROOT_NAV,
        params: {
          screen: Routes.ONBOARDING.NAV,
          params: {
            screen: Routes.ONBOARDING.ONBOARDING,
            params: { onboardingType: 'google' },
          },
        },
      });
      expect(result).toBe(true);
    });

    it('uses the first type parameter when multiple are provided', () => {
      // Arrange
      const deeplink = `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=google&type=apple`;

      // Act
      const result = handleFastOnboarding(deeplink);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith({
        name: Routes.ONBOARDING.ROOT_NAV,
        params: {
          screen: Routes.ONBOARDING.NAV,
          params: {
            screen: Routes.ONBOARDING.ONBOARDING,
            params: { onboardingType: 'google' },
          },
        },
      });
      expect(result).toBe(true);
    });
  });

  describe('invalid or missing type parameter', () => {
    it.each([
      `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding`,
      `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?foo=bar`,
      `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=`,
      `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type&foo=bar`,
      `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=invalid`,
      `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=facebook`,
    ])('returns false and does not navigate for: %s', (deeplink) => {
      // Act
      const result = handleFastOnboarding(deeplink);

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('URL parsing edge cases', () => {
    it('handles custom protocol URLs', () => {
      // Arrange
      const deeplink = 'metamask://onboarding?type=google';

      // Act
      const result = handleFastOnboarding(deeplink);

      // Assert
      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith({
        name: Routes.ONBOARDING.ROOT_NAV,
        params: {
          screen: Routes.ONBOARDING.NAV,
          params: {
            screen: Routes.ONBOARDING.ONBOARDING,
            params: { onboardingType: 'google' },
          },
        },
      });
    });

    it('handles URLs with fragments', () => {
      // Arrange
      const deeplink = `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=apple#section`;

      // Act
      const result = handleFastOnboarding(deeplink);

      // Assert
      expect(result).toBe(true);
    });

    it('return false for invalid URLs', () => {
      // Act & Assert
      expect(() => handleFastOnboarding('not-a-valid-url')).not.toThrow();
      expect(handleFastOnboarding('not-a-valid-url')).toBe(false);
    });
  });

  describe('navigation service edge cases', () => {
    it('handles null navigation service gracefully', () => {
      // Arrange
      jest
        .spyOn(NavigationService, 'navigation', 'get')
        .mockReturnValue(null as unknown as NavigationContainerRef);
      const deeplink = `https://${MM_IO_UNIVERSAL_LINK_HOST}/onboarding?type=google`;

      // Act & Assert
      expect(() => handleFastOnboarding(deeplink)).not.toThrow();
    });
  });
});
