import React from 'react';
import { render } from '@testing-library/react-native';
import BenefitEmptyList from './BenefitEmptyList';

const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.empty-list': 'No benefits available yet',
  };
  return translations[key] || key;
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

describe('BenefitEmptyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty list message', () => {
    const { getByText } = render(<BenefitEmptyList />);

    expect(getByText('No benefits available yet')).toBeOnTheScreen();
    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.empty-list');
  });
});
