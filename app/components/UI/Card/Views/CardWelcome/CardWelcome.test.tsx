import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CardWelcome from './CardWelcome';
import { CardWelcomeSelectors } from '../../../../../../e2e/selectors/Card/CardWelcome.selectors';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

// Mocks
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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.card_onboarding.title': 'Enable MetaMask Card features',
      'card.card_onboarding.description':
        'Change your spending token and network by signing in with your Crypto Life email and password.',
      'card.card_onboarding.verify_account_button': 'Sign in',
      'card.card_onboarding.non_cardholder_title': 'Welcome to MetaMask Card',
      'card.card_onboarding.non_cardholder_description':
        'MetaMask Card is the free and easy way to spend your crypto, with rich onchain rewards.',
      'card.card_onboarding.non_cardholder_verify_account_button':
        'Get started',
      'card.card': 'Card',
    };
    return map[key] || key;
  },
}));

jest.mock('../../../../../images/metal-card.png', () => 1);

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { background: { default: '#fff' } } }),
}));

const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (state = { cardholderAccounts: [], ...initialState }) => state,
    },
  });

describe('CardWelcome', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Non-cardholder flow', () => {
    beforeEach(() => {
      store = createTestStore({ cardholderAccounts: [] });
    });

    it('renders required UI elements', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeTruthy();
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toBeTruthy();
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toBeTruthy();
      expect(
        getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeTruthy();
    });

    it('displays non-cardholder title when no cardholder accounts exist', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toHaveTextContent(strings('card.card_onboarding.non_cardholder_title'));
    });

    it('displays non-cardholder description when no cardholder accounts exist', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toHaveTextContent(
        strings('card.card_onboarding.non_cardholder_description'),
      );
    });

    it('navigates to onboarding root when verify account button pressed', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT);
    });
  });

  describe('Cardholder flow', () => {
    beforeEach(() => {
      store = createTestStore({
        cardholderAccounts: ['0x1234567890abcdef'],
      });
    });

    it('displays cardholder title when cardholder accounts exist', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toHaveTextContent(strings('card.card_onboarding.title'));
    });

    it('displays cardholder description when cardholder accounts exist', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toHaveTextContent(strings('card.card_onboarding.description'));
    });

    it('navigates to authentication when verify account button pressed', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION);
    });
  });
});
