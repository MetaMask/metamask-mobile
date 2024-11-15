// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';

// External dependencies
import { mockTheme } from '../../../util/theme';

// Internal dependencies
import ThemeProvider from './ThemeProvider';
import { THEMEPROVIDER_TESTID } from './ThemeProvider.constants';

// Create a mock store
const mockStore = configureStore([]);
const store = mockStore({
  user: {
    appTheme: mockTheme.themeAppearance, // or any other relevant initial state
  },
});

describe('ThemeProvider', () => {
  it('should provide the correct theme to its children', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider>
          <View />
        </ThemeProvider>
      </Provider>,
    );

    expect(getByTestId(THEMEPROVIDER_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.background.alternative,
    );
  });
});
