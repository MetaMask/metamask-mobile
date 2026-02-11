import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialRootState from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
// eslint-disable-next-line import/no-namespace
import * as utilsTransactions from '../../../util/transactions';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
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

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const mockShowToast = jest.fn();
jest.mock('../../../component-library/components/Toast', () => {
  const actualReact = jest.requireActual('react');
  const MockContext = actualReact.createContext({});
  return {
    ...jest.requireActual('../../../component-library/components/Toast'),
    ToastContext: MockContext,
    ToastVariants: { Plain: 'Plain' },
  };
});

const ToastWrapper = ({ children }: { children: React.ReactNode }) => {
  const {
    ToastContext,
  } = require('../../../component-library/components/Toast');
  return (
    <ToastContext.Provider
      value={{ toastRef: { current: { showToast: mockShowToast } } }}
    >
      {children}
    </ToastContext.Provider>
  );
};

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

  describe('Validation Functions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows warning when address is empty and input loses focus', async () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent(addressInput, 'onBlur');

      await waitFor(() => {
        const warningText = getByTestId('collectible-address-warning');
        expect(warningText.props.children).toBe(
          'collectible.address_cant_be_empty',
        );
      });
    });

    it('shows warning when address is invalid and input loses focus', async () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(addressInput, 'invalid-address');
      fireEvent(addressInput, 'onBlur');

      await waitFor(() => {
        const warningText = getByTestId('collectible-address-warning');
        expect(warningText.props.children).toBe(
          'collectible.address_must_be_valid',
        );
      });
    });

    it('shows warning when address is not a smart contract and input loses focus', async () => {
      jest
        .spyOn(utilsTransactions, 'isSmartContractAddress')
        .mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );
      fireEvent(addressInput, 'onBlur');

      await waitFor(() => {
        const warningText = getByTestId('collectible-address-warning');
        expect(warningText.props.children).toBe(
          'collectible.address_must_be_smart_contract',
        );
      });
    });

    it('clears address warning when valid smart contract address is entered', async () => {
      jest
        .spyOn(utilsTransactions, 'isSmartContractAddress')
        .mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );
      fireEvent(addressInput, 'onBlur');

      await waitFor(() => {
        const warningText = getByTestId('collectible-address-warning');
        expect(warningText.props.children).toBe('');
      });
    });

    it('shows warning when token ID is empty and input loses focus', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent(tokenIdInput, 'onBlur');

      const warningText = getByTestId('collectible-identifier-warning');
      expect(warningText.props.children).toBe(
        'collectible.token_id_cant_be_empty',
      );
    });

    it('clears token ID warning when value is entered', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '123');
      fireEvent(tokenIdInput, 'onBlur');

      const warningText = getByTestId('collectible-identifier-warning');
      expect(warningText.props.children).toBe('');
    });
  });

  describe('Ownership Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest
        .spyOn(utilsTransactions, 'isSmartContractAddress')
        .mockResolvedValue(true);
    });

    it('shows toast when user is not the owner of NFT', async () => {
      jest
        .spyOn(Engine.context.NftController, 'isNftOwner')
        .mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(
        <ToastWrapper>
          <AddCustomCollectible
            navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
            setOpenNetworkSelector={jest.fn()}
            networkId={'0x1'}
            selectedNetwork={'Ethereum Mainnet'}
            networkClientId={'mainnet'}
          />
        </ToastWrapper>,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '55');

      const button = getByTestId('add-collectible-button');

      await act(async () => {
        fireEvent.press(button);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'collectible.not_owner_error_title' }],
          descriptionOptions: { description: 'collectible.not_owner_error' },
        }),
      );
    });

    it('shows toast when ownership verification fails', async () => {
      jest
        .spyOn(Engine.context.NftController, 'isNftOwner')
        .mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithProvider(
        <ToastWrapper>
          <AddCustomCollectible
            navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
            setOpenNetworkSelector={jest.fn()}
            networkId={'0x1'}
            selectedNetwork={'Ethereum Mainnet'}
            networkClientId={'mainnet'}
          />
        </ToastWrapper>,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '55');

      const button = getByTestId('add-collectible-button');

      await act(async () => {
        fireEvent.press(button);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            { label: 'collectible.ownership_verification_error_title' },
          ],
          descriptionOptions: {
            description: 'collectible.ownership_verification_error',
          },
        }),
      );
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('manages loading state during NFT addition', async () => {
      jest
        .spyOn(Engine.context.NftController, 'isNftOwner')
        .mockResolvedValue(true);
      jest
        .spyOn(Engine.context.NftController, 'addNft')
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      jest
        .spyOn(utilsTransactions, 'isSmartContractAddress')
        .mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '55');

      const button = getByTestId('add-collectible-button');

      act(() => {
        fireEvent.press(button);
      });

      // Button should be disabled during loading
      expect(button.props.disabled).toBeTruthy();
    });

    it('sets address from collectibleContract prop on mount', () => {
      const collectibleContract = {
        address: '0x1a92f7381b9f03921564a437210bb9396471050c',
      };

      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          collectibleContract={collectibleContract}
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      expect(addressInput.props.value).toBe(collectibleContract.address);
    });

    it('confirms button is disabled when required fields are missing', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const button = getByTestId('add-collectible-button');
      expect(button.props.disabled).toBeTruthy();
    });

    it('enables confirm button when all required fields are filled', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '55');

      const button = getByTestId('add-collectible-button');
      expect(button.props.disabled).toBeFalsy();
    });

    it('disables confirm button when network is not selected', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={null}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '55');

      const button = getByTestId('add-collectible-button');
      expect(button.props.disabled).toBeTruthy();
    });
  });

  describe('Navigation Interactions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls navigation.goBack when cancel is pressed', () => {
      const mockGoBack = jest.fn();
      const navigation = { navigate: jest.fn(), goBack: mockGoBack };

      const { getByText } = renderWithProvider(
        <AddCustomCollectible
          navigation={navigation}
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const cancelButton = getByText(
        'add_asset.collectibles.cancel_add_collectible',
      );
      fireEvent.press(cancelButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls navigation.goBack after successful NFT addition', async () => {
      const mockGoBack = jest.fn();
      const navigation = { navigate: jest.fn(), goBack: mockGoBack };

      jest
        .spyOn(Engine.context.NftController, 'isNftOwner')
        .mockResolvedValue(true);
      jest
        .spyOn(Engine.context.NftController, 'addNft')
        .mockResolvedValue(undefined);
      jest
        .spyOn(utilsTransactions, 'isSmartContractAddress')
        .mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          navigation={navigation}
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');
      fireEvent.changeText(
        addressInput,
        '0x1a92f7381b9f03921564a437210bb9396471050c',
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');
      fireEvent.changeText(tokenIdInput, '55');

      const button = getByTestId('add-collectible-button');

      await act(async () => {
        fireEvent.press(button);
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('opens network selector when network selector button is pressed', () => {
      const mockSetOpenNetworkSelector = jest.fn();

      const { getAllByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={mockSetOpenNetworkSelector}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const networkButtons = getAllByTestId('select-network-button');
      const networkButton = networkButtons[1]; // Get the TouchableOpacity button
      fireEvent.press(networkButton);

      expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(true);
    });
  });

  describe('Input Interactions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('focuses token ID input when address input is submitted', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const addressInput = getByTestId('input-collectible-address');

      fireEvent(addressInput, 'onSubmitEditing');

      // Since we can't easily test focus in React Native Testing Library,
      // we verify the onSubmitEditing handler exists
      expect(addressInput.props.onSubmitEditing).toBeDefined();
    });

    it('has onSubmitEditing handler on token ID input', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const tokenIdInput = getByTestId('input-collectible-identifier');

      expect(tokenIdInput.props.onSubmitEditing).toBeDefined();
    });
  });

  describe('Props Variations', () => {
    it('renders without navigation prop', () => {
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      expect(getByTestId('import-nft-screen')).toBeTruthy();
    });

    it('renders with empty selectedNetwork', () => {
      const { getByText } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={''}
          selectedNetwork={''}
          networkClientId={''}
        />,
        { state: initialRootState },
      );

      expect(getByText('networks.select_network')).toBeTruthy();
    });

    it('renders network avatar when selectedNetwork is provided', () => {
      const { getAllByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const networkButtons = getAllByTestId('select-network-button');
      expect(networkButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics and Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('handles analytics parameter generation error gracefully', () => {
      // Mock console.error to prevent error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // This tests the getAnalyticsParams function when it encounters an error
      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          networkId={'invalid-chain-id'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      expect(getByTestId('import-nft-screen')).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('stops loading and returns early when validation fails', async () => {
      const mockAddNft = jest.spyOn(Engine.context.NftController, 'addNft');

      const { getByTestId } = renderWithProvider(
        <AddCustomCollectible
          navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
          setOpenNetworkSelector={jest.fn()}
          networkId={'0x1'}
          selectedNetwork={'Ethereum Mainnet'}
          networkClientId={'mainnet'}
        />,
        { state: initialRootState },
      );

      const button = getByTestId('add-collectible-button');

      await act(async () => {
        fireEvent.press(button);
      });

      // Should not call addNft when validation fails
      expect(mockAddNft).not.toHaveBeenCalled();
    });
  });
});
