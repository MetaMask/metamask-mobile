import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyPostOnboardingRedirectType } from '../../../Money/types/navigation';
import {
  MoneyAccountIdentity,
  MoneyAccountRequired,
  MoneyAccountRow,
} from './MoneyAccountRow';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('MoneyAccountRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Money account identity', () => {
    const { getByTestId, getByText } = render(<MoneyAccountIdentity />);

    expect(getByTestId('money-account-identity')).toBeOnTheScreen();
    expect(
      getByText('card.card_spending_limit.money_account_label'),
    ).toBeOnTheScreen();
  });

  it('renders the locked account row', () => {
    const { getByTestId } = render(<MoneyAccountRow />);

    expect(getByTestId('money-account-row')).toBeOnTheScreen();
    expect(getByTestId('money-account-identity')).toBeOnTheScreen();
  });

  it.each(['authentication', 'onboarding'] as const)(
    'opens Money onboarding and returns to Card %s',
    (returnTo) => {
      const { getByTestId } = render(
        <MoneyAccountRequired returnTo={returnTo} />,
      );

      fireEvent.press(getByTestId('money-account-required-cta'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING, {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.CARD,
          cardScreen: returnTo,
        },
      });
    },
  );
});
