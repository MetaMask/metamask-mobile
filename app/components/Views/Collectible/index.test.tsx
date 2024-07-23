import React from 'react';
import { render } from '@testing-library/react-native';
import Collectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext } from '../../../util/theme';

// Mock navigation object
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  // Add other navigation functions that might be used by the Collectible component or its children
};

// Mock useNavigation hook
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Updated mock ThemeContext to provide a comprehensive 'colors' properties for the Collectible component
const theme = {
  colors: {
    primary: {
      default: '#000', // Example color value, replace with actual theme primary color
    },
    background: {
      default: '#FFF', // Example color value, replace with actual theme background color
    },
    icon: {
      default: '#000', // Example color value, replace with actual theme icon color
    },
    overlay: {
      default: '#000', // Example color value, replace with actual theme overlay color
    },
    border: {
      muted: '#000', // Example color value, replace with actual theme border muted color
    },
    text: {
      default: '#000', // Example color value, replace with actual theme text default color
    },
    error: {
      default: '#FF0000', // Added error color
    },
    warning: {
      default: '#FFA500', // Added warning color
    },
    success: {
      default: '#008000', // Added success color
    },
    info: {
      default: '#0000FF', // Added info color
    },
    // Add any other color properties that might be used by the component
  },
};

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  modals: {
    collectibleContractModalVisible: false,
  },
};
const store = mockStore(initialState);

describe('Collectible', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={theme}>
        <Provider store={store}>
          <Collectible
            route={{ params: { address: '0x1' } }}
            navigation={mockNavigation}
          />
        </Provider>
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
