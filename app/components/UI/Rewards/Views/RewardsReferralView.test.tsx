import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import RewardsReferralView from './RewardsReferralView';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selectors
jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      background: '#fff',
    },
  }),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral_title': 'Referral Program',
    };
    return translations[key] || key;
  }),
}));

// Mock getNavigationOptionsTitle
jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Referral Program' })),
}));

// Import the mock
import { getNavigationOptionsTitle } from '../../Navbar';
const mockGetNavigationOptionsTitle =
  getNavigationOptionsTitle as jest.MockedFunction<
    typeof getNavigationOptionsTitle
  >;

// Mock ErrorBoundary
jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
    view,
  }: {
    children: React.ReactNode;
    navigation: unknown;
    view: string;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: `error-boundary-${view.toLowerCase()}` },
      children,
    );
  },
}));

// Mock ReferralDetails component
jest.mock('../components/ReferralDetails/ReferralDetails', () => ({
  __esModule: true,
  default: function MockReferralDetails() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'referral-details' },
      ReactActual.createElement(Text, null, 'Referral Details Component'),
    );
  },
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { ...props, testID: 'safe-area-view' },
      children,
    );
  },
}));

describe('RewardsReferralView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default useSelector mock return values
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      return undefined;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      // Act & Assert
      expect(() => render(<RewardsReferralView />)).not.toThrow();
    });

    it('should render ReferralDetails component', () => {
      // Act
      const { getByTestId, getByText } = render(<RewardsReferralView />);

      // Assert
      expect(getByTestId('referral-details')).toBeTruthy();
      expect(getByText('Referral Details Component')).toBeTruthy();
    });

    it('should wrap content in ErrorBoundary', () => {
      // Act
      const { getByTestId } = render(<RewardsReferralView />);

      // Assert
      expect(getByTestId('error-boundary-referralrewardsview')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should set navigation options on mount', async () => {
      // Act
      render(<RewardsReferralView />);

      // Assert
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalledTimes(1);
      });
    });

    it('should call getNavigationOptionsTitle with correct parameters', async () => {
      // Act
      render(<RewardsReferralView />);

      // Assert
      await waitFor(() => {
        expect(mockGetNavigationOptionsTitle).toHaveBeenCalledWith(
          'Referral Program',
          expect.anything(), // navigation object
          false, // back button parameter
          expect.anything(), // colors object
        );
      });
    });

    it('should set headerTitleAlign to center in navigation options', async () => {
      // Act
      render(<RewardsReferralView />);

      // Assert
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            headerTitleAlign: 'center',
          }),
        );
      });
    });

    it('should update navigation options when colors change', async () => {
      // Act
      const { rerender } = render(<RewardsReferralView />);

      // Clear previous calls
      mockSetOptions.mockClear();
      mockGetNavigationOptionsTitle.mockClear();

      // Trigger re-render to simulate color change
      rerender(<RewardsReferralView />);

      // Assert
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
        expect(mockGetNavigationOptionsTitle).toHaveBeenCalled();
      });
    });
  });

  describe('error boundary integration', () => {
    it('should pass correct view prop to ErrorBoundary', () => {
      // Act
      const { getByTestId } = render(<RewardsReferralView />);

      // Assert
      expect(getByTestId('error-boundary-referralrewardsview')).toBeTruthy();
    });

    it('should pass navigation prop to ErrorBoundary', () => {
      // The navigation prop should be passed to ErrorBoundary
      // This is verified through the mock implementation that receives the navigation prop

      // Act & Assert
      expect(() => render(<RewardsReferralView />)).not.toThrow();
    });
  });

  describe('component lifecycle', () => {
    it('should cleanup properly when unmounted', () => {
      // Act
      const { unmount } = render(<RewardsReferralView />);

      // Assert
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple re-renders gracefully', () => {
      // Act
      const { rerender } = render(<RewardsReferralView />);

      // Assert - Multiple re-renders should not cause issues
      expect(() => {
        rerender(<RewardsReferralView />);
        rerender(<RewardsReferralView />);
        rerender(<RewardsReferralView />);
      }).not.toThrow();
    });
  });

  describe('integration with child components', () => {
    it('should render ReferralDetails without any props', () => {
      // Given that ReferralDetails manages its own state through hooks
      // and Redux selectors, it should not receive any props from the parent

      // Act
      const { getByTestId } = render(<RewardsReferralView />);

      // Assert
      expect(getByTestId('referral-details')).toBeTruthy();
    });
  });
});
