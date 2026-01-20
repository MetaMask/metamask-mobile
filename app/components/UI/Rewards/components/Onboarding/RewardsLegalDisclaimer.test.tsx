import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import RewardsLegalDisclaimer from './RewardsLegalDisclaimer';
import {
  REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
  REWARDS_ONBOARD_TERMS_URL,
} from './constants';

// Mock Linking
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      openURL: jest.fn(),
    },
  };
});

const mockLinkingOpenURL = Linking.openURL as jest.MockedFunction<
  typeof Linking.openURL
>;

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: function MockBox({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(View, { testID, ...props }, children);
    },
    Text: function MockText({
      children,
      variant,
      twClassName,
      onPress,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      variant?: string;
      twClassName?: string;
      onPress?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(
        Text,
        { testID, onPress, ...props },
        children,
      );
    },
    TextVariant: {
      BodySm: 'BodySm',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
  };
});

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles) => (typeof styles === 'string' ? {} : styles)),
  }),
}));

describe('RewardsLegalDisclaimer', () => {
  const defaultProps = {
    disclaimerPart1: 'By continuing, you agree to the',
    disclaimerPart2: 'Terms of Use',
    disclaimerPart3: 'and',
    disclaimerPart4: 'Learn More',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders container with testID', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      expect(
        getByTestId('rewards-legal-disclaimer-container'),
      ).toBeOnTheScreen();
    });

    it('renders content box with testID', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      expect(getByTestId('rewards-legal-disclaimer-content')).toBeOnTheScreen();
    });

    it('renders main text element with testID', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      expect(getByTestId('rewards-legal-disclaimer-text')).toBeOnTheScreen();
    });

    it('renders disclaimer part1 with testID and text', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const part1 = getByTestId('rewards-legal-disclaimer-part1');

      expect(part1).toBeOnTheScreen();
      expect(part1).toHaveTextContent(defaultProps.disclaimerPart1);
    });

    it('renders terms link with testID and text', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const termsLink = getByTestId('rewards-legal-disclaimer-terms-link');

      expect(termsLink).toBeOnTheScreen();
      expect(termsLink).toHaveTextContent(defaultProps.disclaimerPart2);
    });

    it('renders disclaimer part3 with testID and text', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const part3 = getByTestId('rewards-legal-disclaimer-part3');

      expect(part3).toBeOnTheScreen();
      expect(part3).toHaveTextContent(defaultProps.disclaimerPart3);
    });

    it('renders learn more link with testID and text', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const learnMoreLink = getByTestId(
        'rewards-legal-disclaimer-learn-more-link',
      );

      expect(learnMoreLink).toBeOnTheScreen();
      expect(learnMoreLink).toHaveTextContent(defaultProps.disclaimerPart4);
    });
  });

  describe('Link interactions', () => {
    it('opens terms URL when terms link is pressed', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const termsLink = getByTestId('rewards-legal-disclaimer-terms-link');

      fireEvent.press(termsLink);

      expect(mockLinkingOpenURL).toHaveBeenCalledTimes(1);
      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        REWARDS_ONBOARD_TERMS_URL,
      );
    });

    it('opens learn more URL when learn more link is pressed', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const learnMoreLink = getByTestId(
        'rewards-legal-disclaimer-learn-more-link',
      );

      fireEvent.press(learnMoreLink);

      expect(mockLinkingOpenURL).toHaveBeenCalledTimes(1);
      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
      );
    });

    it('opens both links when both are pressed', () => {
      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...defaultProps} />,
      );

      const termsLink = getByTestId('rewards-legal-disclaimer-terms-link');
      const learnMoreLink = getByTestId(
        'rewards-legal-disclaimer-learn-more-link',
      );

      fireEvent.press(termsLink);
      fireEvent.press(learnMoreLink);

      expect(mockLinkingOpenURL).toHaveBeenCalledTimes(2);
      expect(mockLinkingOpenURL).toHaveBeenNthCalledWith(
        1,
        REWARDS_ONBOARD_TERMS_URL,
      );
      expect(mockLinkingOpenURL).toHaveBeenNthCalledWith(
        2,
        REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
      );
    });
  });

  describe('Text content', () => {
    it('displays all text parts in correct order', () => {
      const customProps = {
        disclaimerPart1: 'Custom part 1',
        disclaimerPart2: 'Custom Terms',
        disclaimerPart3: 'Custom part 3',
        disclaimerPart4: 'Custom Learn More',
      };

      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...customProps} />,
      );

      expect(getByTestId('rewards-legal-disclaimer-part1')).toHaveTextContent(
        customProps.disclaimerPart1,
      );
      expect(
        getByTestId('rewards-legal-disclaimer-terms-link'),
      ).toHaveTextContent(customProps.disclaimerPart2);
      expect(getByTestId('rewards-legal-disclaimer-part3')).toHaveTextContent(
        customProps.disclaimerPart3,
      );
      expect(
        getByTestId('rewards-legal-disclaimer-learn-more-link'),
      ).toHaveTextContent(customProps.disclaimerPart4);
    });

    it('handles empty string text parts', () => {
      const emptyProps = {
        disclaimerPart1: '',
        disclaimerPart2: '',
        disclaimerPart3: '',
        disclaimerPart4: '',
      };

      const { getByTestId } = render(
        <RewardsLegalDisclaimer {...emptyProps} />,
      );

      expect(getByTestId('rewards-legal-disclaimer-part1')).toHaveTextContent(
        '',
      );
      expect(
        getByTestId('rewards-legal-disclaimer-terms-link'),
      ).toHaveTextContent('');
      expect(getByTestId('rewards-legal-disclaimer-part3')).toHaveTextContent(
        '',
      );
      expect(
        getByTestId('rewards-legal-disclaimer-learn-more-link'),
      ).toHaveTextContent('');
    });
  });
});
