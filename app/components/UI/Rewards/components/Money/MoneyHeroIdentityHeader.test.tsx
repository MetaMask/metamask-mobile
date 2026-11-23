import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import MoneyHeroIdentityHeader from './MoneyHeroIdentityHeader';

const renderHeader = (offerEndsIn: string | null) =>
  renderWithProvider(
    <MoneyHeroIdentityHeader
      title="Earn on eligible fees"
      offerEndsIn={offerEndsIn}
      offerEndsTestID="offer-ends"
      titleRowClassName="px-4 pb-4"
    />,
    { state: { user: { appTheme: AppThemeKey.light } } },
  );

describe('MoneyHeroIdentityHeader', () => {
  it('renders the title and the offer-end line', () => {
    const { getByText, getByTestId } = renderHeader('Offer ends in 3 days');

    expect(getByText('Earn on eligible fees')).toBeOnTheScreen();
    expect(getByTestId('offer-ends')).toHaveTextContent('Offer ends in 3 days');
  });

  it('hides the offer-end line when there is no duration', () => {
    const { queryByTestId } = renderHeader(null);

    expect(queryByTestId('offer-ends')).toBeNull();
  });
});
