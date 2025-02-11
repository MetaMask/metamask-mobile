import React from 'react';
import { shallow } from 'enzyme';
import Collectible from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { act, render } from '@testing-library/react-native';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      addNft: jest.fn(),
      updateNftMetadata: jest.fn(),
      checkAndUpdateAllNftsOwnershipStatus: jest.fn(),
    },
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
  },
}));

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

  it('calls detectNfts and resets refreshing state', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <Collectible
            navigation={navigationMock}
            route={{ params: defaultCollectibleContract }}
          />
        </ThemeContext.Provider>
      </Provider>,
    );

    // Locate the RefreshControl using its testID.
    const scrollView = getByTestId('refresh-control');

    expect(scrollView).toBeDefined();

    const { refreshControl } = scrollView.props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(
      Engine.context.NftDetectionController.detectNfts,
    ).toHaveBeenCalledTimes(1);
  });
});
