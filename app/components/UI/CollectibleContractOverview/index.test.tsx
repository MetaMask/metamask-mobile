import React from 'react';
import CollectibleContractOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
import { fireEvent, render } from '@testing-library/react-native';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockStore = configureMockStore();

const navigationMock = {
  navigate: jest.fn(),
  push: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      NftController: {
        allNfts: {
          '0x123': {
            [CHAIN_IDS.MAINNET]: [
              {
                address: '0x72b1FDb6443338A158DeC2FbF411B71123456789',
                description: 'Description of NFT 1',
                favorite: false,
                image: 'https://image.com/113',
                isCurrentlyOwned: true,
                name: 'My Nft #113',
                standard: 'ERC721',
                tokenId: '113',
                tokenURI:
                  'https://opensea.io/assets/0x72b1FDb6443338A158DeC2FbF411B71123456789/113',
              },
            ],
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: '1',
          accounts: {
            '1': {
              address: '0x123',
            },
          },
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('CollectibleContractOverview', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContractOverview
          collectibleContract={{
            name: 'name',
            symbol: 'symbol',
            description: 'description',
            address: '',
            totalSupply: 1,
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('calls onSend and navigates when send button is pressed', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractOverview
            collectibleContract={{
              name: 'name',
              symbol: 'symbol',
              description: 'description',
              address: '0x72b1FDb6443338A158DeC2FbF411B71123456789',
              totalSupply: 1,
            }}
            navigation={navigationMock}
          />
        </ThemeContext.Provider>
      </Provider>,
    );

    const sendButton = wrapper.getByTestId(
      TokenOverviewSelectorsIDs.SEND_BUTTON,
    );
    fireEvent.press(sendButton);

    expect(navigationMock.navigate).toHaveBeenCalledWith('SendFlowView');
  });

  it('calls onAdd and pushes to navigation when add button is pressed', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractOverview
            collectibleContract={{
              name: 'name',
              symbol: 'symbol',
              description: 'description',
              address: '0x72b1FDb644338A158DeC2FbF411B71123456789',
              totalSupply: 1,
            }}
            navigation={navigationMock}
          />
        </ThemeContext.Provider>
      </Provider>,
    );

    const addButton = wrapper.getByTestId(TokenOverviewSelectorsIDs.ADD_BUTTON);
    fireEvent.press(addButton);

    expect(navigationMock.push).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
      collectibleContract: {
        address: '0x72b1FDb644338A158DeC2FbF411B71123456789',
        description: 'description',
        name: 'name',
        symbol: 'symbol',
        totalSupply: 1,
      },
    });
  });
});
