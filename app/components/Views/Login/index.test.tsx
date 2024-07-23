import React from 'react';
import { render } from '@testing-library/react-native';
import Login from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext } from '../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  user: {
    passwordSet: true,
  },
};
const store = mockStore(initialState);

// Updated mock context to provide all 'colors' properties used by the `Login` component
const mockContext = {
  colors: {
    primary: '#000', // Example color value, replace with actual required colors
    secondary: '#FFF', // Example color value, replace with actual required colors
    background: {
      default: '#FFF', // Example color value, replace with actual required colors
    },
    text: {
      default: '#333', // Example color value, replace with actual required colors
    },
    error: {
      default: '#B00020', // Example color value, replace with actual required colors
    },
    border: {
      default: '#E0E0E0', // Example color value, replace with actual required colors
    },
    // Add other color properties as required by the component
  },
  themeAppearance: 'light',
};

describe('Login', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockContext}>
        <Provider store={store}>
          <Login />
        </Provider>
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
