import React from 'react';
import { render } from '@testing-library/react-native';
import ReferralInfoSection from './ReferralInfoSection';

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral.info.title': 'Invite Friends & Earn',
      'rewards.referral.info.description':
        'Share your referral code with friends and earn rewards when they join MetaMask.',
    };
    return translations[key] || key;
  }),
}));

describe('ReferralInfoSection', () => {
  describe('rendering', () => {
    it('should render correctly', () => {
      const { getByText } = render(<ReferralInfoSection />);

      expect(getByText('Invite Friends & Earn')).toBeTruthy();
      expect(
        getByText(
          'Share your referral code with friends and earn rewards when they join MetaMask.',
        ),
      ).toBeTruthy();
    });

    it('should display the correct title', () => {
      const { getByText } = render(<ReferralInfoSection />);

      const titleElement = getByText('Invite Friends & Earn');
      expect(titleElement).toBeTruthy();
    });

    it('should display the correct description', () => {
      const { getByText } = render(<ReferralInfoSection />);

      const descriptionElement = getByText(
        'Share your referral code with friends and earn rewards when they join MetaMask.',
      );
      expect(descriptionElement).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should render text elements that are accessible', () => {
      const { getByText } = render(<ReferralInfoSection />);

      const titleElement = getByText('Invite Friends & Earn');
      const descriptionElement = getByText(
        'Share your referral code with friends and earn rewards when they join MetaMask.',
      );

      expect(titleElement).toBeTruthy();
      expect(descriptionElement).toBeTruthy();
    });
  });

  describe('component structure', () => {
    it('should render without crashing', () => {
      expect(() => render(<ReferralInfoSection />)).not.toThrow();
    });

    it('should be a functional component with no props', () => {
      // This test ensures the component can be rendered without any props
      const renderResult = render(<ReferralInfoSection />);
      expect(renderResult).toBeTruthy();
    });
  });
});
