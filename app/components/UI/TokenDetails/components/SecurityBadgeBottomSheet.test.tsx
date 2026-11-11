import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SecurityBadgeBottomSheet from './SecurityBadgeBottomSheet';
import { IconName, IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(
  AnalyticsEventBuilder.createEventBuilder,
);

jest.mock('../../../hooks/useAnalytics/useAnalytics');

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
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
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

  describe('tdp_version property', () => {
    const builtEvents = (
      event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
    ) =>
      mockTrackEvent.mock.calls
        .map(([built]) => built)
        .filter((built) => built?.name === event.category);

    it('defaults tdp_version to v2 when the param is absent', () => {
      render(<SecurityBadgeBottomSheet />);

      const opened = builtEvents(
        MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_OPENED,
      );
      expect(opened).toHaveLength(1);
      expect(opened[0].properties).toEqual(
        expect.objectContaining({ tdp_version: 'v2' }),
      );
    });

    it('carries tdp_version on both opened and action-taken events', () => {
      const mockOnProceed = jest.fn();
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          onProceed: mockOnProceed,
          tdpVersion: 'v3',
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      expect(
        builtEvents(MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_OPENED)[0]
          .properties,
      ).toEqual(expect.objectContaining({ tdp_version: 'v3' }));

      fireEvent.press(getByText(strings('security_trust.continue_anyway')));

      expect(
        builtEvents(
          MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_ACTION_TAKEN,
        )[0].properties,
      ).toEqual(
        expect.objectContaining({ action: 'proceed', tdp_version: 'v3' }),
      );
    });
  });

  describe('Feature tag rendering', () => {
    it('renders feature tags for Malicious severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          features: [
            {
              featureId: 'KNOWN_MALICIOUS',
              type: 'negative',
              description: 'Malicious',
            },
            { featureId: 'RUGPULL', type: 'negative', description: 'Rugpull' },
          ],
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Both feature tag labels should be rendered
      expect(getByText('Known malicious')).toBeOnTheScreen();
      expect(getByText('Rugpull risk')).toBeOnTheScreen();
    });

    it('renders feature tags for Warning severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Warning',
          features: [
            {
              featureId: 'AIRDROP_PATTERN',
              type: 'negative',
              description: 'Airdrop',
            },
          ],
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Feature tag label should be rendered
      expect(getByText('Suspicious airdrop')).toBeOnTheScreen();
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
      expect(getByText('Likely impersonator')).toBeOnTheScreen();
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
      expect(queryByText('Verified')).not.toBeOnTheScreen();
    });

    it('limits feature tags to maximum of 5', () => {
      const manyFeatures = [
        { featureId: 'RUGPULL', type: 'negative' as const, description: 'A' },
        {
          featureId: 'KNOWN_MALICIOUS',
          type: 'negative' as const,
          description: 'B',
        },
        {
          featureId: 'HIGH_TRANSFER_FEE',
          type: 'negative' as const,
          description: 'C',
        },
        {
          featureId: 'UNSELLABLE_TOKEN',
          type: 'negative' as const,
          description: 'D',
        },
        {
          featureId: 'TOKEN_BACKDOOR',
          type: 'negative' as const,
          description: 'E',
        },
        { featureId: 'POST_DUMP', type: 'negative' as const, description: 'F' },
        {
          featureId: 'HIGH_BUY_FEE',
          type: 'negative' as const,
          description: 'G',
        },
      ];

      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          features: manyFeatures,
        },
      }));

      const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

      // Should render first 5 feature tags
      expect(getByText('Rugpull risk')).toBeOnTheScreen();
      expect(getByText('Known malicious')).toBeOnTheScreen();
      expect(getByText('High transfer fee')).toBeOnTheScreen();
      expect(getByText('Unsellable token')).toBeOnTheScreen();
      expect(getByText('Token backdoor')).toBeOnTheScreen();

      // Should NOT render 6th and 7th tags
      expect(queryByText('Possible price manipulation')).not.toBeOnTheScreen();
      expect(queryByText('High buy fee')).not.toBeOnTheScreen();
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
      expect(getByText(bannerText)).toBeOnTheScreen();

      // Original description should NOT be rendered
      expect(queryByText('This should not appear')).not.toBeOnTheScreen();
    });

    it('renders malicious banner with error styling', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          tokenSymbol: 'TEST',
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Should render the malicious banner text
      const bannerText = strings(
        'security_trust.malicious_token_banner_description',
        {
          symbol: 'TEST',
        },
      );
      expect(getByText(bannerText)).toBeOnTheScreen();
    });

    it('renders malicious banner with no_symbol fallback when tokenSymbol is empty', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          tokenSymbol: '',
          description: 'This should not appear',
        },
      }));

      const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

      const bannerText = strings(
        'security_trust.malicious_token_banner_description_no_symbol',
      );
      expect(getByText(bannerText)).toBeOnTheScreen();
      expect(queryByText('This should not appear')).not.toBeOnTheScreen();
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
      expect(getByText('Warning description')).toBeOnTheScreen();

      // Malicious banner should NOT be rendered
      const maliciousBannerText = strings(
        'security_trust.malicious_token_banner_description',
        {
          symbol: 'TEST',
        },
      );
      expect(queryByText(maliciousBannerText)).not.toBeOnTheScreen();
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
      expect(continueButton).toBeOnTheScreen();

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
      expect(continueButton).toBeOnTheScreen();
    });
  });

  describe('Header display', () => {
    it('renders title for Warning severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Warning',
          title: 'Risky Token',
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Should render the title
      expect(getByText('Risky Token')).toBeOnTheScreen();
    });

    it('renders title for Malicious severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Malicious',
          title: 'Malicious Token',
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Should render the title
      expect(getByText('Malicious Token')).toBeOnTheScreen();
    });

    it('renders title and description for Verified severity', () => {
      mockUseRouteImpl = jest.fn(() => ({
        params: {
          ...mockRouteParams,
          severity: 'Verified',
          icon: IconName.SecurityTick,
          title: 'Verified Token',
          description: 'This token has been verified',
        },
      }));

      const { getByText } = render(<SecurityBadgeBottomSheet />);

      // Should render title and description for Verified
      expect(getByText('Verified Token')).toBeOnTheScreen();
      expect(getByText('This token has been verified')).toBeOnTheScreen();
    });
  });
});
