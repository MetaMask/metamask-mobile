import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { TokensEmptyState } from './TokensEmptyState';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';

const mockStore = configureMockStore();
const mockNavigate = jest.fn();

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the tailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args) => {
      if (Array.isArray(args[0])) {
        return args[0].join(' ');
      }
      return args.join(' ');
    }),
  }),
}));

// Mock i18n strings
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'wallet.tokens_empty_description': 'Tokens you hold will appear here.',
      'wallet.show_tokens_without_balance': 'Show tokens without balance',
    };
    return translations[key] || key;
  },
}));

// Mock TabEmptyState component to simplify testing
jest.mock('../../../component-library/components-temp/TabEmptyState', () => ({
  TabEmptyState: ({
    icon,
    description,
    actionButtonText,
    actionButtonProps,
    testID,
  }: {
    icon?: React.ReactNode;
    description?: string;
    actionButtonText?: string;
    actionButtonProps?: { onPress: () => void };
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID={testID || 'tab-empty-state'}>
        {icon && <View testID="empty-state-icon">{icon}</View>}
        {description && (
          <Text testID="empty-state-description">{description}</Text>
        )}
        {actionButtonText && actionButtonProps && (
          <TouchableOpacity
            testID="empty-state-action-button"
            onPress={actionButtonProps.onPress}
          >
            <Text>{actionButtonText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

describe('TokensEmptyState', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
    user: {
      appTheme: 'light',
    },
  };

  const store = mockStore(initialState);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <TokensEmptyState />
      </Provider>,
    );

    expect(getByTestId('tokens-empty-state')).toBeOnTheScreen();
  });

  it('renders empty state icon', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <TokensEmptyState />
      </Provider>,
    );

    expect(getByTestId('empty-state-icon')).toBeOnTheScreen();
  });

  it('renders empty state description text', () => {
    const { getByText } = render(
      <Provider store={store}>
        <TokensEmptyState />
      </Provider>,
    );

    expect(getByText('Tokens you hold will appear here.')).toBeOnTheScreen();
  });

  it('renders action button with correct text', () => {
    const { getByText } = render(
      <Provider store={store}>
        <TokensEmptyState />
      </Provider>,
    );

    expect(getByText('Show tokens without balance')).toBeOnTheScreen();
  });

  it('navigates to general settings when action button is pressed', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <TokensEmptyState />
      </Provider>,
    );

    const actionButton = getByTestId('empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.ONBOARDING.GENERAL_SETTINGS,
    });
  });

  it('passes additional props to TabEmptyState', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <TokensEmptyState testID="custom-empty-state" />
      </Provider>,
    );

    expect(getByTestId('custom-empty-state')).toBeOnTheScreen();
  });
});
