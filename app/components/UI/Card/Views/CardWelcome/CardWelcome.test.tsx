import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CardWelcome from './CardWelcome';
import { CardWelcomeSelectors } from '../../../../../../e2e/selectors/Card/CardWelcome.selectors';
import { strings } from '../../../../../../locales/i18n';

// Mocks
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
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

describe('CardWelcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders required UI elements', () => {
    const { getByTestId } = render(<CardWelcome />);

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

  it('calls goBack when verify account button pressed', () => {
    const { getByTestId } = render(<CardWelcome />);
    fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigationOptions provides header components and close triggers goBack', () => {
    interface MockNav {
      goBack: jest.Mock;
    }
    interface HasNavOptions {
      navigationOptions: (args: { navigation: MockNav }) => {
        headerLeft: () => React.ReactElement;
        headerRight: () => React.ReactElement;
        headerTitle: () => React.ReactElement;
      };
    }
    const navigation: MockNav = { goBack: mockGoBack };
    const options = (CardWelcome as unknown as HasNavOptions).navigationOptions(
      { navigation },
    );
    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();

    const headerRightEl = options.headerRight();
    // Simulate pressing close button by invoking onPress prop
    headerRightEl.props.onPress();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
