import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import ThemeProvider from '../../../../../component-library/providers/ThemeProvider/ThemeProvider';
import PerpsDirectionButton, {
  type PerpsDirection,
} from './PerpsDirectionButton';

const mockStore = configureMockStore();

const renderDirectionButton = (
  direction: PerpsDirection,
  appTheme: 'dark' | 'light',
) => {
  const store = mockStore({ user: { appTheme } });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <PerpsDirectionButton
          direction={direction}
          testID="perps-direction-button"
        >
          {direction}
        </PerpsDirectionButton>
      </ThemeProvider>
    </Provider>,
  );
};

describe('PerpsDirectionButton', () => {
  it.each([
    {
      appTheme: 'light',
      direction: 'long',
      backgroundColor: lightTheme.colors.success.default,
      foregroundColor: lightTheme.colors.success.inverse,
    },
    {
      appTheme: 'dark',
      direction: 'long',
      backgroundColor: darkTheme.colors.success.default,
      foregroundColor: darkTheme.colors.success.inverse,
    },
    {
      appTheme: 'light',
      direction: 'short',
      backgroundColor: lightTheme.colors.error.default,
      foregroundColor: lightTheme.colors.error.inverse,
    },
    {
      appTheme: 'dark',
      direction: 'short',
      backgroundColor: darkTheme.colors.error.default,
      foregroundColor: darkTheme.colors.error.inverse,
    },
  ] as const)(
    'uses the $direction semantic palette in $appTheme mode',
    ({ appTheme, direction, backgroundColor, foregroundColor }) => {
      renderDirectionButton(direction, appTheme);

      expect(screen.getByTestId('perps-direction-button')).toHaveStyle({
        backgroundColor,
      });
      expect(screen.getByText(direction)).toHaveStyle({
        color: foregroundColor,
      });
    },
  );

  it('calls onPress when the button is pressed', () => {
    const onPress = jest.fn();
    const store = mockStore({ user: { appTheme: 'light' } });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <PerpsDirectionButton
            direction="long"
            onPress={onPress}
            testID="perps-direction-button"
          >
            long
          </PerpsDirectionButton>
        </ThemeProvider>
      </Provider>,
    );

    fireEvent.press(screen.getByTestId('perps-direction-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when the button is disabled', () => {
    const onPress = jest.fn();
    const store = mockStore({ user: { appTheme: 'light' } });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <PerpsDirectionButton
            direction="short"
            isDisabled
            onPress={onPress}
            testID="perps-direction-button"
          >
            short
          </PerpsDirectionButton>
        </ThemeProvider>
      </Provider>,
    );

    const button = screen.getByTestId('perps-direction-button');

    expect(button).toBeDisabled();

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });
});
