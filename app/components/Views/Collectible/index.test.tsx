import React from 'react';
import { shallow } from 'enzyme';
import Collectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { render } from '@testing-library/react-native';

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

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const navigationMock = {
  navigate: jest.fn(),
  push: jest.fn(),
};

// const toggleModalMock = jest.fn();

const defaultCollectibleContract = {
  address: '0x1',
  name: 'Default Collectible',
  logo: 'default-logo-url',
};

const defaultCollectible = { address: '0x1', name: '', image: null };

describe('Collectible', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Collectible route={{ params: { address: '0x1' } }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders modal when collectibleContractModalVisible is true', () => {
    const storeMocked = mockStore({
      collectibles: [defaultCollectible],
      modals: { collectibleContractModalVisible: true },
      engine: {
        backgroundState,
      },
    });
    const container = render(
      <Provider store={storeMocked}>
        <ThemeContext.Provider value={mockTheme}>
          <Collectible
            navigation={navigationMock}
            route={{ params: defaultCollectibleContract }}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    const modal = container.getByTestId(
      'collectible-contract-information-title',
    );
    expect(modal).toBeTruthy();
  });
});
