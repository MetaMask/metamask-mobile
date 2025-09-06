import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialRootState from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { act, fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
// eslint-disable-next-line import/no-namespace
import * as utilsTransactions from '../../../util/transactions';

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      state: {
        allNfts: {},
        allNftContracts: {},
        ignoredNfts: [],
      },
      addNft: jest.fn(),
      isNftOwner: jest.fn(),
    },
  },
}));

const mockStore = configureMockStore();

const store = mockStore(initialRootState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => ''),
}));

describe('AddCustomCollectible', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={''}
          selectedNetwork={''}
          networkClientId={''}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('handles address input changes', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomCollectible
        setOpenNetworkSelector={jest.fn()}
        networkId={''}
        selectedNetwork={''}
        networkClientId={''}
      />,
      {
        state: initialRootState,
      },
    );

    const textfield = getByTestId('input-collectible-address');
    fireEvent.changeText(textfield, '0xtestAddress');
    expect(textfield.props.value).toBe('0xtestAddress');
  });

  it('handles tokenId input changes', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomCollectible
        setOpenNetworkSelector={jest.fn()}
        networkId={''}
        selectedNetwork={''}
        networkClientId={''}
      />,
      {
        state: initialRootState,
      },
    );

    const textfield = getByTestId('input-collectible-identifier');
    fireEvent.changeText(textfield, '55');
    expect(textfield.props.value).toBe('55');
  });

  it('calls addNft', async () => {
    const spyOnAddNft = jest
      .spyOn(Engine.context.NftController, 'addNft')
      .mockImplementation(async () => undefined);

    jest
      .spyOn(Engine.context.NftController, 'isNftOwner')
      .mockResolvedValue(true);

    jest
      .spyOn(utilsTransactions, 'isSmartContractAddress')
      .mockResolvedValue(true);

    const { getByTestId } = renderWithProvider(
      <AddCustomCollectible
        navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
        setOpenNetworkSelector={jest.fn()}
        networkId={''}
        selectedNetwork={''}
        networkClientId={''}
      />,
      { state: initialRootState },
    );

    const textfieldAddress = getByTestId('input-collectible-address');
    fireEvent.changeText(
      textfieldAddress,
      '0x1a92f7381b9f03921564a437210bb9396471050c',
    );

    const textfieldTokenId = getByTestId('input-collectible-identifier');
    fireEvent.changeText(textfieldTokenId, '55');

    const button = getByTestId('add-collectible-button');

    await act(async () => {
      fireEvent.press(button);
    });

    expect(spyOnAddNft).toHaveBeenCalledTimes(1);
  });
});
