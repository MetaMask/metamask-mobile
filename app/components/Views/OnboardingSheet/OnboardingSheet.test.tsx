import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { ThemeContext, mockTheme } from '../../../util/theme';
import OnboardingSheet from '.';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = ReactNative;

  const BottomSheet = ({
    children,
  }: {
    children: React.ReactNode;
    goBack?: () => void;
  }) => <View testID="mock-bottom-sheet">{children}</View>;

  return {
    ...actual,
    BottomSheet,
  };
});

const routeParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: routeParams,
  }),
}));

const Stack = createStackNavigator();

function OnboardingSheetScreen() {
  return <OnboardingSheet />;
}

describe('OnboardingSheet', () => {
  beforeEach(() => {
    Object.keys(routeParams).forEach((key) => {
      delete routeParams[key];
    });
  });

  const renderSheet = () =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="OnboardingSheet"
              component={OnboardingSheetScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeContext.Provider>,
    );

  it('invokes Telegram login callback with createWallet true', () => {
    const onPressContinueWithTelegram = jest.fn();

    Object.assign(routeParams, {
      onPressContinueWithTelegram,
      createWallet: true,
    });

    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON),
    );

    expect(onPressContinueWithTelegram).toHaveBeenCalledWith(true);
  });

  it('invokes Telegram login callback with createWallet false for import flows', () => {
    const onPressContinueWithTelegram = jest.fn();

    Object.assign(routeParams, {
      onPressContinueWithTelegram,
      createWallet: false,
    });

    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON),
    );

    expect(onPressContinueWithTelegram).toHaveBeenCalledWith(false);
  });
});
