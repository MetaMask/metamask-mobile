import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReferralActionsSection from './ReferralActionsSection';

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral.actions.share_referral_link': 'Share Referral Link',
    };
    return translations[key] || key;
  }),
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
    }: {
      label: string;
      value: string | null;
      onCopy?: () => void;
    }) =>
      MockReact.createElement(
        ReactNative.View,
        {
          testID: `copyable-field-${label.toLowerCase().replace(/\s+/g, '-')}`,
        },
        MockReact.createElement(ReactNative.Text, null, label),
        MockReact.createElement(ReactNative.Text, null, value),
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
  const defaultProps = {
    referralCode: 'TEST123',
    referralCodeLoading: false,
    onCopyCode: jest.fn(),
    onCopyLink: jest.fn(),
    onShareLink: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render correctly with all props', () => {
      const { getByTestId, getByText } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(getByTestId('copyable-field-your-referral-code')).toBeTruthy();
      expect(getByTestId('copyable-field-your-referral-link')).toBeTruthy();
      expect(getByText('Share Referral Link')).toBeTruthy();
    });

    it('should render with null referral code', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} referralCode={null} />,
      );

      expect(getByTestId('copyable-field-your-referral-code')).toBeTruthy();
      expect(getByTestId('copyable-field-your-referral-link')).toBeTruthy();
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

      const copyButton = getByTestId('copy-button-your-referral-code');
      fireEvent.press(copyButton);

      expect(mockOnCopyCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('referral link functionality', () => {
    it('should display the correct referral link', () => {
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} />,
      );

      expect(getByText('https://mm.io/invite/TEST123')).toBeTruthy();
    });

    it('should call onCopyLink with correct URL when referral link copy button is pressed', () => {
      const mockOnCopyLink = jest.fn();
      const { getByTestId } = render(
        <ReferralActionsSection
          {...defaultProps}
          onCopyLink={mockOnCopyLink}
        />,
      );

      const copyButton = getByTestId('copy-button-your-referral-link');
      fireEvent.press(copyButton);

      expect(mockOnCopyLink).toHaveBeenCalledWith(
        'https://mm.io/invite/TEST123',
      );
    });

    it('should generate correct link with different referral codes', () => {
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} referralCode="CUSTOM456" />,
      );

      expect(getByText('https://mm.io/invite/CUSTOM456')).toBeTruthy();
    });
  });

  describe('share functionality', () => {
    it('should call onShareLink with correct URL when share button is pressed', () => {
      const mockOnShareLink = jest.fn();
      const { getByText } = render(
        <ReferralActionsSection
          {...defaultProps}
          onShareLink={mockOnShareLink}
        />,
      );

      const shareButton = getByText('Share Referral Link');
      fireEvent.press(shareButton);

      expect(mockOnShareLink).toHaveBeenCalledWith(
        'https://mm.io/invite/TEST123',
      );
    });
  });

  describe('callback handling', () => {
    it('should handle missing onCopyCode callback gracefully', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} onCopyCode={undefined} />,
      );

      const copyButton = getByTestId('copy-button-your-referral-code');
      expect(() => fireEvent.press(copyButton)).not.toThrow();
    });

    it('should handle missing onCopyLink callback gracefully', () => {
      const { getByTestId } = render(
        <ReferralActionsSection {...defaultProps} onCopyLink={undefined} />,
      );

      const copyButton = getByTestId('copy-button-your-referral-link');
      expect(() => fireEvent.press(copyButton)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in referral code', () => {
      const specialCode = 'TEST-123_ABC';
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} referralCode={specialCode} />,
      );

      expect(getByText(specialCode)).toBeTruthy();
      expect(getByText(`https://mm.io/invite/${specialCode}`)).toBeTruthy();
    });

    it('should handle very long referral codes', () => {
      const longCode = 'A'.repeat(50);
      const { getByText } = render(
        <ReferralActionsSection {...defaultProps} referralCode={longCode} />,
      );

      expect(getByText(longCode)).toBeTruthy();
      expect(getByText(`https://mm.io/invite/${longCode}`)).toBeTruthy();
    });
  });
});
