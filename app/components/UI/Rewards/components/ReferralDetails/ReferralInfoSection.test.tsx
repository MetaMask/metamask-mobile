import React from 'react';
import { render } from '@testing-library/react-native';
import ReferralInfoSection from './ReferralInfoSection';

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral.info.title': 'Share your code with friends',
      'rewards.referral.info.description':
        'Some campaigns may have extra benefits for referrals. Check the description for each campaign to confirm.',
    };
    return translations[key] || key;
  }),
}));

describe('ReferralInfoSection', () => {
  describe('rendering', () => {
    it('should render correctly', () => {
      const { getByText } = render(<ReferralInfoSection />);

      expect(getByText('Share your code with friends')).toBeTruthy();
      expect(
        getByText(
          'Some campaigns may have extra benefits for referrals. Check the description for each campaign to confirm.',
        ),
      ).toBeTruthy();
    });

    it('should display the correct title', () => {
      const { getByText } = render(<ReferralInfoSection />);

      const titleElement = getByText('Share your code with friends');
      expect(titleElement).toBeTruthy();
    });

    it('should display the correct description', () => {
      const { getByText } = render(<ReferralInfoSection />);

      const descriptionElement = getByText(
        'Some campaigns may have extra benefits for referrals. Check the description for each campaign to confirm.',
      );
      expect(descriptionElement).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should render text elements that are accessible', () => {
      const { getByText } = render(<ReferralInfoSection />);

      const titleElement = getByText('Share your code with friends');
      const descriptionElement = getByText(
        'Some campaigns may have extra benefits for referrals. Check the description for each campaign to confirm.',
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
