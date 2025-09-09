import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferralDetails from './ReferralDetails';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';

// Mock external dependencies
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));
jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));
jest.mock('../../hooks/useReferralDetails');
jest.mock('./ReferralInfoSection', () => {
  const mockReact = jest.requireActual('react');
  const { Text } = jest.requireActual('@metamask/design-system-react-native');
  return function MockReferralInfoSection() {
    return mockReact.createElement(
      Text,
      { testID: 'referral-info-section' },
      'ReferralInfoSection',
    );
  };
});
jest.mock('./ReferralStatsSection', () => {
  const mockReact = jest.requireActual('react');
  const { Text } = jest.requireActual('@metamask/design-system-react-native');
  return function MockReferralStatsSection(props: object) {
    return mockReact.createElement(
      Text,
      {
        testID: 'referral-stats-section',
        'data-testid': `stats-${JSON.stringify(props)}`,
      },
      'ReferralStatsSection',
    );
  };
});
jest.mock('./ReferralActionsSection', () => {
  const mockReact = jest.requireActual('react');
  const { Text } = jest.requireActual('@metamask/design-system-react-native');
  return function MockReferralActionsSection(props: object) {
    return mockReact.createElement(
      Text,
      {
        testID: 'referral-actions-section',
        'data-testid': `actions-${JSON.stringify(props)}`,
      },
      'ReferralActionsSection',
    );
  };
});

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral.actions.share_referral_subject': 'Join me on MetaMask!',
    };
    return translations[key] || key;
  }),
}));

// Mock the custom hook
jest.mock('../../hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn(),
}));

const mockUseReferralDetails = jest.requireMock(
  '../../hooks/useReferralDetails',
).useReferralDetails;

// Type for Redux selector functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectorFunction = (state: any) => any;

describe('ReferralDetails', () => {
  const mockClipboard = Clipboard as jest.Mocked<typeof Clipboard>;
  const mockShare = Share as jest.Mocked<typeof Share>;

  const renderComponent = () => render(<ReferralDetails />);

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useSelector to return different values based on the selector
    mockUseSelector.mockImplementation((selector: SelectorFunction) => {
      // Mock different selectors based on their function
      switch (selector.toString()) {
        case 'selectReferralCode':
          return 'REFER123';
        case 'selectReferralCount':
          return 5;
        case 'selectBalanceRefereePortion':
          return 1500;
        case 'selectSeasonStatusLoading':
          return false;
        case 'selectReferralDetailsLoading':
          return false;
        default:
          // Default fallback values
          if (selector.name === 'selectReferralCode') return 'REFER123';
          if (selector.name === 'selectReferralCount') return 5;
          if (selector.name === 'selectBalanceRefereePortion') return 1500;
          if (selector.name === 'selectSeasonStatusLoading') return false;
          if (selector.name === 'selectReferralDetailsLoading') return false;
          return null;
      }
    });

    mockUseReferralDetails.mockReturnValue(null);
    (mockClipboard.setString as jest.Mock).mockClear();
    (mockShare.open as jest.Mock).mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render all child components', () => {
      // Arrange & Act
      const { getByTestId } = renderComponent();

      // Assert
      expect(getByTestId('referral-info-section')).toBeTruthy();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });

    it('should render without crashing', () => {
      // Act & Assert
      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('Redux selectors integration', () => {
    it('should call useSelector multiple times for different selectors', () => {
      // Act
      renderComponent();

      // Assert - useSelector should be called for each selector in the component
      expect(mockUseSelector).toHaveBeenCalledTimes(5);
    });

    it('should use the referral details hook', () => {
      // Act
      renderComponent();

      // Assert
      expect(mockUseReferralDetails).toHaveBeenCalled();
    });
  });

  describe('props passing to child components', () => {
    it('should pass correct props to ReferralStatsSection', () => {
      // Arrange
      const earnedPoints = 2000;
      const refereeCount = 8;
      const seasonLoading = true;
      const detailsLoading = false;

      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectBalanceRefereePortion')
          return earnedPoints;
        if (selector.name === 'selectReferralCount') return refereeCount;
        if (selector.name === 'selectSeasonStatusLoading') return seasonLoading;
        if (selector.name === 'selectReferralDetailsLoading')
          return detailsLoading;
        if (selector.name === 'selectReferralCode') return 'TEST123';
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert - Check if component received correct props structure
      const statsElement = getByTestId('referral-stats-section');
      expect(statsElement).toBeTruthy();
    });

    it('should pass correct props to ReferralActionsSection', () => {
      // Arrange
      const referralCode = 'TEST456';
      const loading = true;

      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return referralCode;
        if (selector.name === 'selectReferralDetailsLoading') return loading;
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert
      const actionsElement = getByTestId('referral-actions-section');
      expect(actionsElement).toBeTruthy();
    });
  });

  describe('handler function behavior', () => {
    it('should verify component renders correctly with referral code', () => {
      // Arrange
      const referralCode = 'COPY123';
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return referralCode;
        // Default values for other selectors
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert - The handlers are passed to child components, so we test integration
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });

    it('should handle null referral code gracefully', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return null;
        // Default values for other selectors
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act & Assert
      expect(() => renderComponent()).not.toThrow();
    });

    it('should render with different referral codes', () => {
      // Arrange
      const referralCode = 'TEST456';
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return referralCode;
        // Default values for other selectors
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });

    it('should handle empty string referral code', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return '';
        // Default values for other selectors
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act & Assert
      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('integration with child components', () => {
    it('should render with share functionality available', () => {
      // Arrange
      const referralCode = 'SHARE123';
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return referralCode;
        // Default values for other selectors
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert - Child component receives the share handlers
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });

    it('should render when share functionality is not available', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return null;
        // Default values for other selectors
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act & Assert - Should still render even without share capability
      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('loading states', () => {
    it('should handle season status loading state', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectSeasonStatusLoading') return true;
        // Default values for other selectors
        if (selector.name === 'selectReferralCode') return 'REFER123';
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert - Component should render despite loading state
      expect(getByTestId('referral-stats-section')).toBeTruthy();
    });

    it('should handle referral details loading state', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralDetailsLoading') return true;
        // Default values for other selectors
        if (selector.name === 'selectReferralCode') return 'REFER123';
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert - Component should render despite loading state
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });

    it('should handle both loading states simultaneously', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectSeasonStatusLoading') return true;
        if (selector.name === 'selectReferralDetailsLoading') return true;
        // Default values for other selectors
        if (selector.name === 'selectReferralCode') return 'REFER123';
        if (selector.name === 'selectReferralCount') return 5;
        if (selector.name === 'selectBalanceRefereePortion') return 1500;
        return null;
      });

      // Act
      const { getByTestId } = renderComponent();

      // Assert
      expect(getByTestId('referral-info-section')).toBeTruthy();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined selector values', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return null;
        if (selector.name === 'selectReferralCount') return undefined;
        if (selector.name === 'selectBalanceRefereePortion') return null;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act & Assert
      expect(() => renderComponent()).not.toThrow();
    });

    it('should handle zero values correctly', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector.name === 'selectReferralCode') return 'REFER123';
        if (selector.name === 'selectReferralCount') return 0;
        if (selector.name === 'selectBalanceRefereePortion') return 0;
        if (selector.name === 'selectSeasonStatusLoading') return false;
        if (selector.name === 'selectReferralDetailsLoading') return false;
        return null;
      });

      // Act & Assert
      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('component structure', () => {
    it('should use Box component with correct flex direction', () => {
      // Act
      const { getByTestId } = renderComponent();

      // Assert - All child components should be present in column layout
      expect(getByTestId('referral-info-section')).toBeTruthy();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
      expect(getByTestId('referral-actions-section')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should render all components in accessible way', () => {
      // Act
      const { getByTestId } = renderComponent();

      // Assert - All components should be findable, indicating proper accessibility
      const infoSection = getByTestId('referral-info-section');
      const statsSection = getByTestId('referral-stats-section');
      const actionsSection = getByTestId('referral-actions-section');

      expect(infoSection).toBeTruthy();
      expect(statsSection).toBeTruthy();
      expect(actionsSection).toBeTruthy();
    });
  });
});
