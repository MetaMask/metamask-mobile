import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import MoneyHeroIdentityHeader from './MoneyHeroIdentityHeader';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const renderHeader = (offerEndsIn: string | null) =>
  renderWithProvider(
    <MoneyHeroIdentityHeader
      title="Earn on eligible fees"
      offerEndsIn={offerEndsIn}
      offerEndsTestID="offer-ends"
      termsTitle="Terms and Conditions"
      termsTestID="terms-info"
      titleRowClassName="px-4 pb-4"
    />,
    { state: { user: { appTheme: AppThemeKey.light } } },
  );

describe('MoneyHeroIdentityHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and the offer-end line', () => {
    const { getByText, getByTestId } = renderHeader('Offer ends in 3 days');

    expect(getByText('Earn on eligible fees')).toBeOnTheScreen();
    expect(getByTestId('offer-ends')).toHaveTextContent('Offer ends in 3 days');
  });

  it('hides the offer-end line when there is no duration', () => {
    const { queryByTestId } = renderHeader(null);

    expect(queryByTestId('offer-ends')).toBeNull();
  });

  it('opens the terms sheet from the info button', () => {
    const { getByTestId } = renderHeader(null);

    fireEvent.press(getByTestId('terms-info'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_MONEY_TERMS_SHEET,
    );
  });
});
