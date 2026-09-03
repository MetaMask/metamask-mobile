import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferralActionsSection from './ReferralActionsSection';
import { selectIsCurrentSubscriptionVipEnabled } from '../../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../../selectors/featureFlagController/vipProgram';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/rewards', () => ({
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
}));

jest.mock('../../../../../selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: jest.fn(),
}));

jest.mock('../RewardsVipReferralTag/RewardsVipReferralTag', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      MockReact.createElement(View, { testID: 'rewards-vip-referral-tag' }),
  };
});

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock CopyableField component
jest.mock('./CopyableField', () => {
  const MockReact = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      label,
      value,
      onCopy,
      trailingAccessory,
    }: {
      label: string;
      value: string | null;
      onCopy?: () => void;
      trailingAccessory?: React.ReactNode;
    }) =>
      MockReact.createElement(
        ReactNative.View,
        {
          testID: `copyable-field-${label.toLowerCase().replace(/\s+/g, '-')}`,
        },
        MockReact.createElement(ReactNative.Text, null, label),
        MockReact.createElement(ReactNative.Text, null, value),
        trailingAccessory,
        MockReact.createElement(
          ReactNative.TouchableOpacity,
          {
            testID: `copy-button-${label.toLowerCase().replace(/\s+/g, '-')}`,
            onPress: onCopy,
            disabled: !value,
          },
          MockReact.createElement(ReactNative.Text, null, 'Copy'),
        ),
      ),
  };
});

describe('ReferralActionsSection', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  const defaultProps = {
    referralCode: 'TEST123',
    referralCodeLoading: false,
    referralCodeError: false,
    onCopyCode: jest.fn(),
    onCopyLink: jest.fn(),
  };

  const setVipSelectors = ({
    isVipProgramEnabled,
    isSubscriptionVipEnabled,
  }: {
    isVipProgramEnabled: boolean;
    isSubscriptionVipEnabled: boolean;
  }) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectVipProgramEnabled) {
        return isVipProgramEnabled;
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return isSubscriptionVipEnabled;
      }
      return undefined;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setVipSelectors({
      isVipProgramEnabled: false,
      isSubscriptionVipEnabled: false,
    });
  });

  describe('rendering', () => {
    it('should render correctly with all props', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(
        getByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeTruthy();
      expect(
        getByTestId('copyable-field-rewards.referral.referral_link'),
      ).toBeTruthy();
    });

    it('should render with null referral code', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} referralCode={null} />,
      );

      expect(
        getByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeTruthy();
      expect(
        getByTestId('copyable-field-rewards.referral.referral_link'),
      ).toBeTruthy();
    });

    it('should show the VIP referral tag on the referral code field when VIP applies', () => {
      setVipSelectors({
        isVipProgramEnabled: true,
        isSubscriptionVipEnabled: true,
      });

      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(getByTestId('rewards-vip-referral-tag')).toBeTruthy();
    });

    it('should not show the VIP referral tag when the VIP program flag is off', () => {
      setVipSelectors({
        isVipProgramEnabled: false,
        isSubscriptionVipEnabled: true,
      });

      const { queryByTestId } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(queryByTestId('rewards-vip-referral-tag')).toBeNull();
    });

    it('should not show the VIP referral tag while the referral code is loading', () => {
      setVipSelectors({
        isVipProgramEnabled: true,
        isSubscriptionVipEnabled: true,
      });

      const { queryByTestId } = render(
        <ReferralActionsSection {...defaultProps} referralCodeLoading />,
      );

      expect(queryByTestId('rewards-vip-referral-tag')).toBeNull();
    });
  });

  describe('referral code functionality', () => {
    it('should display the correct referral code', () => {
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(getByText('TEST123')).toBeTruthy();
    });

    it('should call onCopyCode when referral code copy button is pressed', () => {
      const mockOnCopyCode = jest.fn();
      const { getByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          onCopyCode={mockOnCopyCode}
        />,
      );

      const copyButton = getByTestId(
        'copy-button-rewards.referral.referral_code',
      );
      fireEvent.press(copyButton);

      expect(mockOnCopyCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('referral link functionality', () => {
    it('should display the correct referral link', () => {
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(
        getByText('link.metamask.io/rewards?referral=TEST123'),
      ).toBeTruthy();
    });

    it('should call onCopyLink with correct URL when referral link copy button is pressed', () => {
      const mockOnCopyLink = jest.fn();
      const { getByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          onCopyLink={mockOnCopyLink}
        />,
      );

      const copyButton = getByTestId(
        'copy-button-rewards.referral.referral_link',
      );
      fireEvent.press(copyButton);

      expect(mockOnCopyLink).toHaveBeenCalledWith(
        'https://link.metamask.io/rewards?referral=TEST123',
      );
    });

    it('should generate correct link with different referral codes', () => {
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} referralCode="CUSTOM456" />,
      );

      expect(
        getByText('link.metamask.io/rewards?referral=CUSTOM456'),
      ).toBeTruthy();
    });
  });

  describe('callback handling', () => {
    it('should handle missing onCopyCode callback gracefully', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} onCopyCode={undefined} />,
      );

      const copyButton = getByTestId(
        'copy-button-rewards.referral.referral_code',
      );
      expect(() => fireEvent.press(copyButton)).not.toThrow();
    });

    it('should handle missing onCopyLink callback gracefully', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} onCopyLink={undefined} />,
      );

      const copyButton = getByTestId(
        'copy-button-rewards.referral.referral_link',
      );
      expect(() => fireEvent.press(copyButton)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should return null when error occurs and not loading with no referral code', () => {
      // Arrange
      const { queryByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          referralCodeError
          referralCodeLoading={false}
          referralCode={null}
        />,
      );

      // Assert - Component should not render anything
      expect(
        queryByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeNull();
      expect(
        queryByTestId('copyable-field-rewards.referral.referral_link'),
      ).toBeNull();
    });

    it('should render normally when error occurs but still loading', () => {
      // Arrange
      const { getByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          referralCodeError
          referralCodeLoading
          referralCode={null}
        />,
      );

      // Assert - Component should render despite error because it's loading
      expect(
        getByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeTruthy();
    });

    it('should render normally when error occurs but referral code exists', () => {
      // Arrange
      const { getByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          referralCodeError
          referralCodeLoading={false}
          referralCode="ERROR123"
        />,
      );

      // Assert - Component should render despite error because referral code exists
      expect(
        getByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeTruthy();
    });

    it('should render normally when no error regardless of other props', () => {
      // Arrange
      const { getByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          referralCodeError={false}
          referralCodeLoading={false}
          referralCode={null}
        />,
      );

      // Assert - Component should render when no error
      expect(
        getByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeTruthy();
    });

    it('should handle undefined referral code with error gracefully', () => {
      // Arrange
      const { queryByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          referralCodeError
          referralCodeLoading={false}
          referralCode={undefined}
        />,
      );

      // Assert - Component should not render anything
      expect(
        queryByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeNull();
      expect(
        queryByTestId('copyable-field-rewards.referral.referral_link'),
      ).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in referral code', () => {
      const specialCode = 'TEST-123_ABC';
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} referralCode={specialCode} />,
      );

      expect(getByText(specialCode)).toBeTruthy();
      expect(
        getByText(`link.metamask.io/rewards?referral=${specialCode}`),
      ).toBeTruthy();
    });

    it('should handle very long referral codes', () => {
      const longCode = 'A'.repeat(50);
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} referralCode={longCode} />,
      );

      expect(getByText(longCode)).toBeTruthy();
      expect(
        getByText(`link.metamask.io/rewards?referral=${longCode}`),
      ).toBeTruthy();
    });

    it('should handle combination of error conditions correctly', () => {
      // Arrange - All conditions that should trigger early return
      const { queryByTestId } = render(
        <ReferralActionsSection
          referralCode={null}
          referralCodeLoading={false}
          referralCodeError
          onCopyCode={jest.fn()}
          onCopyLink={jest.fn()}
        />,
      );

      // Assert - Component should not render anything
      expect(
        queryByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeNull();
      expect(
        queryByTestId('copyable-field-rewards.referral.referral_link'),
      ).toBeNull();
    });

    it('should render when only one condition is met for early return', () => {
      // Arrange - Only error is true, but other conditions prevent early return
      const { getByTestId } = render(
        <ReferralActionsSection
          referralCode="TEST123"
          referralCodeLoading={false}
          referralCodeError
          onCopyCode={jest.fn()}
          onCopyLink={jest.fn()}
        />,
      );

      // Assert - Should render because referralCode exists
      expect(
        getByTestId('copyable-field-rewards.referral.referral_code'),
      ).toBeTruthy();
    });
  });
});
