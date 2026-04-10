import React from 'react';
import { Text as MockText, View as MockView } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { MoneyScreenStack } from './index';

const EXPECTED_CARD_BACKGROUND = '#money-test-bg';

const themeWithCustomBackground = {
  ...mockTheme,
  colors: {
    ...mockTheme.colors,
    background: {
      ...mockTheme.colors.background,
      default: EXPECTED_CARD_BACKGROUND,
    },
  },
};

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({
      children,
      screenOptions,
    }: {
      children: React.ReactNode;
      screenOptions?: {
        headerShown?: boolean;
        cardStyle?: { backgroundColor?: string };
      };
    }) => (
      <MockView testID="money-stack-navigator">
        <MockText testID="money-card-background-color">
          {screenOptions?.cardStyle?.backgroundColor ?? 'none'}
        </MockText>
        {screenOptions?.headerShown === false && (
          <MockText testID="money-header-hidden">header-hidden</MockText>
        )}
        {children}
      </MockView>
    ),
    Screen: ({ name }: { name: string }) => (
      <MockView testID={`money-screen-${name}`}>
        <MockText>{name}</MockText>
      </MockView>
    ),
  }),
}));

jest.mock('../Views/MoneyHomeView', () => () => (
  <MockView testID="mock-money-home-view" />
));

jest.mock('../Views/MoneyActivityView', () => () => (
  <MockView testID="mock-money-activity-view" />
));

describe('MoneyScreenStack', () => {
  it('registers Money home and activity screens', () => {
    const { getByTestId } = renderWithProvider(<MoneyScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyHome')).toBeOnTheScreen();
    expect(getByTestId('money-screen-MoneyActivity')).toBeOnTheScreen();
  });

  it('sets stack card background from theme to avoid flash during inner navigation', () => {
    const { getByTestId } = renderWithProvider(<MoneyScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-card-background-color')).toHaveTextContent(
      EXPECTED_CARD_BACKGROUND,
    );
  });

  it('hides the stack header', () => {
    const { getByTestId } = renderWithProvider(<MoneyScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-header-hidden')).toBeOnTheScreen();
  });
});
