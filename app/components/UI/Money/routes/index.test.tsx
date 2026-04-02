/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
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

jest.mock('@react-navigation/stack', () => {
  const { View, Text } = require('react-native');
  return {
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
        <View testID="money-stack-navigator">
          <Text testID="money-card-background-color">
            {screenOptions?.cardStyle?.backgroundColor ?? 'none'}
          </Text>
          {screenOptions?.headerShown === false && (
            <Text testID="money-header-hidden">header-hidden</Text>
          )}
          {children}
        </View>
      ),
      Screen: ({ name }: { name: string }) => {
        const { View: V, Text: T } = require('react-native');
        return (
          <V testID={`money-screen-${name}`}>
            <T>{name}</T>
          </V>
        );
      },
    }),
  };
});

jest.mock('../Views/MoneyHomeView', () => {
  const { View } = require('react-native');
  return () => <View testID="mock-money-home-view" />;
});

jest.mock('../Views/MoneyActivityView', () => {
  const { View } = require('react-native');
  return () => <View testID="mock-money-activity-view" />;
});

describe('MoneyScreenStack', () => {
  it('registers Money home and activity screens', () => {
    const { getByTestId } = renderWithProvider(<MoneyScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyHome')).toBeTruthy();
    expect(getByTestId('money-screen-MoneyActivity')).toBeTruthy();
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

    expect(getByTestId('money-header-hidden')).toBeTruthy();
  });
});
