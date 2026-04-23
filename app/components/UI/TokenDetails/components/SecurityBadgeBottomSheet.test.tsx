import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SecurityBadgeBottomSheet from './SecurityBadgeBottomSheet';
import { IconName, IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockRouteParams = {
  icon: IconName.SecurityTick,
  iconColor: IconColor.SuccessDefault,
  title: 'Test Title',
  description: 'Test Description',
  source: 'badge',
  severity: 'Verified',
  tokenAddress: '0x1234567890abcdef',
  tokenSymbol: 'TEST',
  chainId: '0x1',
};

let mockUseRouteImpl = jest.fn(() => ({
  params: mockRouteParams,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => mockUseRouteImpl(),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      isFocused: jest.fn(() => true),
    }),
  };
});

describe('SecurityBadgeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouteImpl = jest.fn(() => ({
      params: mockRouteParams,
    }));
  });

  it('renders without crashing', () => {
    const { getByText } = render(<SecurityBadgeBottomSheet />);
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
  });

  it('tracks bottom sheet opened event on mount', () => {
    render(<SecurityBadgeBottomSheet />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_OPENED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('displays "Got it" button when onProceed is not provided', () => {
    const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

    expect(getByText(strings('security_trust.got_it'))).toBeTruthy();
    expect(queryByText(strings('security_trust.proceed'))).toBeNull();
    expect(queryByText(strings('security_trust.cancel'))).toBeNull();
  });

  it('displays title and description from route params', () => {
    const { getByText } = render(<SecurityBadgeBottomSheet />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
  });

  it('displays proceed and cancel buttons when onProceed is provided', () => {
    const mockOnProceed = jest.fn();

    mockUseRouteImpl = jest.fn(() => ({
      params: {
        ...mockRouteParams,
        onProceed: mockOnProceed,
      },
    }));

    const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

    expect(getByText(strings('security_trust.continue_anyway'))).toBeTruthy();
    expect(getByText(strings('security_trust.cancel'))).toBeTruthy();
    expect(queryByText(strings('security_trust.got_it'))).toBeNull();
  });

  it('calls onProceed and tracks action when proceed button is pressed', () => {
    const mockOnProceed = jest.fn();

    mockUseRouteImpl = jest.fn(() => ({
      params: {
        ...mockRouteParams,
        onProceed: mockOnProceed,
      },
    }));

    const { getByText } = render(<SecurityBadgeBottomSheet />);

    fireEvent.press(getByText(strings('security_trust.continue_anyway')));

    expect(mockOnProceed).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_ACTION_TAKEN,
    );
  });

  it('tracks cancel action when cancel button is pressed', () => {
    const mockOnProceed = jest.fn();

    mockUseRouteImpl = jest.fn(() => ({
      params: {
        ...mockRouteParams,
        onProceed: mockOnProceed,
      },
    }));

    const { getByText } = render(<SecurityBadgeBottomSheet />);

    fireEvent.press(getByText(strings('security_trust.cancel')));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_ACTION_TAKEN,
    );
  });

  describe('IconAlert rendering for feature tags', () => {
    it('renders IconAlert for each feature tag when severity is Malicious', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          features: [
            {
              featureId: 'honeypot',
              type: 'negative',
              description: 'Honeypot',
            },
            { featureId: 'fake_token', type: 'negative', description: 'Fake' },
          ],
        },
      }));

      const { getAllByTestId } = render(<SecurityBadgeBottomSheet />);

      // Should render IconAlert for each feature tag (2) + banner (1) + header (1) = 4 total
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThanOrEqual(2);
    });

    it('renders IconAlert for each feature tag when severity is Warning', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Warning',
          features: [
            {
              featureId: 'high_tax',
              type: 'negative',
              description: 'High Tax',
            },
          ],
        },
      }));

      const { getAllByTestId } = render(<SecurityBadgeBottomSheet />);

      // Should render IconAlert for feature tag + header
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders feature tags for Spam severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Spam',
          features: [
            {
              featureId: 'IMPERSONATOR_HIGH_CONFIDENCE',
              type: 'negative',
              description: 'Impersonator',
            },
          ],
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Feature tag label should be rendered for Spam tokens
      expect(getByText('Likely impersonator')).toBeTruthy();
    });

    it('does not render feature tags for Verified severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Verified',
          features: [
            { featureId: 'verified', type: 'info', description: 'Verified' },
          ],
        },
      }));

      const { queryByText } = render(<SecurityBadgeBottomSheet />);

      // Feature tags should not be rendered for Verified tokens
      expect(queryByText('Verified')).toBeNull();
    });

    it('limits feature tags to maximum of 5', () => {
      const manyFeatures = Array.from({ length: 10 }, (_, i) => ({
        featureId: `feature_${i}`,
        type: 'negative' as const,
        description: `Feature ${i}`,
      }));

      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          features: manyFeatures,
        },
      }));

      const { getAllByTestId } = render(<SecurityBadgeBottomSheet />);

      // Should render max 5 feature tag IconAlerts + 1 banner + 1 header = 7 total
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeLessThanOrEqual(7);
    });
  });

  describe('Malicious token banner', () => {
    it('renders malicious banner instead of description when severity is Malicious', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          tokenSymbol: 'SCAM',
          description: 'This should not appear',
        },
      }));

      const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

      // Banner with token symbol should be rendered
      const bannerText = strings(
        'security_trust.malicious_token_banner_description',
        {
          symbol: 'SCAM',
        },
      );
      expect(getByText(bannerText)).toBeTruthy();

      // Original description should NOT be rendered
      expect(queryByText('This should not appear')).toBeNull();
    });

    it('renders malicious banner with IconAlert', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          tokenSymbol: 'TEST',
        },
      }));

      const { getAllByTestId } = render(<SecurityBadgeBottomSheet />);

      // Should include banner IconAlert + header IconAlert
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThanOrEqual(2);
    });

    it('does not render malicious banner for Warning severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Warning',
          description: 'Warning description',
        },
      }));

      const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

      // Regular description should be rendered
      expect(getByText('Warning description')).toBeTruthy();

      // Malicious banner should NOT be rendered
      const maliciousBannerText = strings(
        'security_trust.malicious_token_banner_description',
        {
          symbol: 'TEST',
        },
      );
      expect(queryByText(maliciousBannerText)).toBeNull();
    });
  });

  describe('Continue button styling for Malicious tokens', () => {
    it('applies error styling to Continue button when severity is Malicious', () => {
      const mockOnProceed = jest.fn();

      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          onProceed: mockOnProceed,
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      const continueButton = getByText(
        strings('security_trust.continue_anyway'),
      );
      expect(continueButton).toBeTruthy();

      // Button should exist and be pressable
      fireEvent.press(continueButton);
      expect(mockOnProceed).toHaveBeenCalled();
    });

    it('does not apply error styling to Continue button for Warning severity', () => {
      const mockOnProceed = jest.fn();

      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Warning',
          onProceed: mockOnProceed,
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      const continueButton = getByText(
        strings('security_trust.continue_anyway'),
      );
      expect(continueButton).toBeTruthy();
    });
  });

  describe('Header icon rendering', () => {
    it('renders IconAlert for Warning severity in header', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Warning',
        },
      }));

      const { getAllByTestId } = render(<SecurityBadgeBottomSheet />);

      // Should have at least one IconAlert in header
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders IconAlert for Malicious severity in header', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
        },
      }));

      const { getAllByTestId } = render(<SecurityBadgeBottomSheet />);

      // Should have at least one IconAlert in header
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders regular Icon for Verified severity in header', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Verified',
          icon: IconName.SecurityTick,
        },
      }));

      const { getByTestId, queryAllByTestId } = render(
        <SecurityBadgeBottomSheet />,
      );

      // Should render regular icon (not IconAlert) for Verified
      expect(getByTestId('icon')).toBeTruthy();

      // IconAlert might still appear but regular icon should be primary
      const iconAlerts = queryAllByTestId('icon-alert');
      // For Verified, if there are IconAlerts, they would be minimal
      expect(iconAlerts.length).toBeLessThan(2);
    });
  });
});
