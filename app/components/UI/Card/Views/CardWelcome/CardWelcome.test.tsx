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
      'card.card_onboarding.title': 'Welcome to MetaMask Card',
      'card.card_onboarding.description': 'Use your card to spend crypto.',
      'card.card_onboarding.verify_account_button': 'Verify account',
      'card.card': 'Card',
    };
    return map[key] || key;
  },
}));

jest.mock('../../../../../images/metal-card.png', () => 1);

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { background: { default: '#fff' } } }),
}));

const createTestStore = () =>
  configureStore({
    reducer: {
      card: (state = {}) => state,
    },
  });

describe('CardWelcome', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    store = createTestStore();
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
    ).toHaveTextContent(strings('card.card_onboarding.title'));
    expect(
      getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
    ).toHaveTextContent(strings('card.card_onboarding.description'));
    expect(
      getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON),
    ).toBeTruthy();
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
