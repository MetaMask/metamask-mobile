import React from 'react';
import { render } from '@testing-library/react-native';
import BenefitsView from './index';

describe('BenefitsView', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<BenefitsView />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the Benefits text', () => {
    const { getByText } = render(<BenefitsView />);
    expect(getByText('Benefits')).toBeTruthy();
  });
});
