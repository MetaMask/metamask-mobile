import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContractInformation from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { fireEvent, render } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => {
      callback();
    }),
  },
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};

const navigationMock = {
  navigate: jest.fn(),
  push: jest.fn(),
};

const onCloseMock = jest.fn();

const store = mockStore(initialState);

describe('CollectibleContractInformation', () => {
  const mockRunAfterInteractions =
    InteractionManager.runAfterInteractions as jest.Mock;
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContractInformation
          collectibleContract={{
            name: 'name',
            symbol: 'symbol',
            description: 'description',
            address: '0x123',
            totalSupply: 1,
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should call onClose when title text is pressed', () => {
    const collectibleContract = {
      name: 'name',
      symbol: 'symbol',
      description: 'description',
      address: '0x123',
      totalSupply: 1,
    };

    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractInformation
            navigation={navigationMock}
            onClose={onCloseMock}
            collectibleContract={collectibleContract}
          />
        </ThemeContext.Provider>
      </Provider>,
    );

    // Find the Text element that displays the collectible name
    const titleText = getByTestId('collectible-contract-information-title');
    fireEvent.press(titleText);
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should navigate to OpenSea when credits are pressed', async () => {
    const collectibleContract = {
      name: 'name',
      symbol: 'symbol',
      description: 'description',
      address: '0x123',
      totalSupply: 1,
    };

    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractInformation
            navigation={navigationMock}
            onClose={onCloseMock}
            collectibleContract={collectibleContract}
          />
        </ThemeContext.Provider>
      </Provider>,
    );

    // Find the credits TouchableOpacity by looking for the text "Powered by OpenSea"
    const creditsTouchable = wrapper.getByTestId(
      'collectible-contract-information-opensea',
    );

    fireEvent(creditsTouchable, 'press');

    expect(mockRunAfterInteractions).toHaveBeenCalled();
  });
});
