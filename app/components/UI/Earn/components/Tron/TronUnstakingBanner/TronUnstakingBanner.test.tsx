import React from 'react';
import { render } from '@testing-library/react-native';
import TronUnstakingBanner from './TronUnstakingBanner';
import { strings } from '../../../../../../../locales/i18n';

describe('TronUnstakingBanner', () => {
  it('renders the title with the given amount', () => {
    const { getByText } = render(<TronUnstakingBanner amount="500" />);

    const expectedTitle = strings('stake.tron.unstaking_banner.title', {
      amount: '500',
    });
    expect(getByText(expectedTitle)).toBeOnTheScreen();
  });

  it('renders the description', () => {
    const { getByText } = render(<TronUnstakingBanner amount="500" />);

    const expectedDescription = strings(
      'stake.tron.unstaking_banner.description',
    );
    expect(getByText(expectedDescription)).toBeOnTheScreen();
  });

  it('renders with a different amount', () => {
    const { getByText } = render(<TronUnstakingBanner amount="1,234.5" />);

    const expectedTitle = strings('stake.tron.unstaking_banner.title', {
      amount: '1,234.5',
    });
    expect(getByText(expectedTitle)).toBeOnTheScreen();
  });
});
