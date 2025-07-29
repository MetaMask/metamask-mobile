import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { Store } from 'redux';

import SendTo from './index';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { validateAddressOrENS } from '../../../../../../util/address';
import { SendViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/SendView.selectors';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  validateAddressOrENS: jest.fn(),
}));

jest.mock('../../../../../../util/networks/handleNetworkSwitch', () => ({
  handleNetworkSwitch: jest.fn(),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockStore = configureStore();
const navigationPropMock = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
};
const routeMock = {
  params: {},
};

describe('SendTo Component', () => {
  let store: Store;

  const mockValidateAddressOrENS = jest.mocked(validateAddressOrENS);

  beforeEach(() => {
    jest.clearAllMocks();
    store = mockStore({
      ...initialRootState,
      transaction: {
        selectedAsset: {},
      },
      settings: { useBlockieIcon: false },
    });

    mockValidateAddressOrENS.mockResolvedValue(
      {} as unknown as ReturnType<typeof validateAddressOrENS>,
    );
  });

  it('render matches snapshot', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('navigates to Amount screen', () => {
    const MOCK_TARGET_ADDRESS = '0x0000000000000000000000000000000000000000';
    const { navigate } = navigationPropMock;
    const routeProps = {
      params: {
        txMeta: {
          target_address: MOCK_TARGET_ADDRESS,
        },
      },
    };

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeProps} />
        </ThemeContext.Provider>
      </Provider>,
    );
    fireEvent.press(screen.getByText('Next'));
    expect(navigate).toHaveBeenCalledWith('Amount');
  });

  it('shows the warning message when the target address is invalid', () => {
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, 'invalid address');

    const expectedWarningMessage = getByText(
      'No address has been set for this name.',
    );

    expect(expectedWarningMessage).toBeOnTheScreen();
  });

  it('validates address when to address changes', () => {
    mockValidateAddressOrENS.mockResolvedValue(
      {} as unknown as ReturnType<typeof validateAddressOrENS>,
    );

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, '0x1234567890123456789012345678901234567890');

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  it('navigates to Amount screen with valid address', () => {
    const { navigate } = navigationPropMock;
    mockValidateAddressOrENS.mockResolvedValue({
      addressError: undefined,
      toEnsName: undefined,
      addressReady: true,
      toEnsAddress: '0x1234567890123456789012345678901234567890',
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, '0x1234567890123456789012345678901234567890');

    const nextButton = screen.getByTestId(
      SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
    );
    fireEvent.press(nextButton);

    expect(navigate).toHaveBeenCalledWith('Amount');
  });

  it('prevents navigation with invalid address', () => {
    const { navigate } = navigationPropMock;
    mockValidateAddressOrENS.mockResolvedValue({
      addressError: 'Invalid address',
      toEnsName: undefined,
      addressReady: false,
      toEnsAddress: undefined,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, 'invalid-address');

    const nextButton = screen.getByTestId(
      SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
    );
    fireEvent.press(nextButton);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('disables Next button when address is not ready', () => {
    mockValidateAddressOrENS.mockResolvedValue({
      addressError: undefined,
      toEnsName: undefined,
      addressReady: false,
      toEnsAddress: undefined,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, '0x1234567890123456789012345678901234567890');

    const nextButton = screen.getByTestId(
      SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
    );
    expect(nextButton.props.disabled).toBe(true);
  });

  it('resolves ENS name to address', () => {
    const ensName = 'vitalik.eth';
    const resolvedAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    mockValidateAddressOrENS.mockResolvedValue({
      addressError: undefined,
      toEnsName: ensName,
      addressReady: true,
      toEnsAddress: resolvedAddress,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, ensName);

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      ensName,
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  it('shows error for invalid ENS name', () => {
    const invalidEnsName = 'nonexistent.eth';

    mockValidateAddressOrENS.mockResolvedValue({
      addressError: 'No address has been set for this name.',
      toEnsName: invalidEnsName,
      addressReady: false,
      toEnsAddress: undefined,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, invalidEnsName);

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      invalidEnsName,
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  it('shows warning for contract address', () => {
    const contractAddress = '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8';

    mockValidateAddressOrENS.mockResolvedValue({
      addressError: 'SYMBOL_ERROR',
      toEnsName: undefined,
      addressReady: true,
      toEnsAddress: contractAddress,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: true,
      isOnlyWarning: true,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, contractAddress);

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      contractAddress,
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });
});
