import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { fireEvent } from '@testing-library/react-native';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

const mockSetOpenNetworkSelector = jest.fn();

jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'test-network', url: 'https://test-2.com/' }),
  isMainnetByChainId: jest.fn().mockReturnValue(true),
}));

describe('AddCustomToken', () => {
  it('render correctly', () => {
    const { toJSON } = renderWithProvider(<AddCustomToken />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call network selector bottom sheet handler', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken setOpenNetworkSelector={mockSetOpenNetworkSelector} />,
      { state: mockInitialState },
    );

    const networkSearch = getByTestId(
      ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON,
    );

    fireEvent(networkSearch, 'onPress');
    expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(true);
  });

  it('should handle text input callback for short address', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken setOpenNetworkSelector={mockSetOpenNetworkSelector} />,
      { state: mockInitialState },
    );

    // First set some initial values (if needed)
    const tokenSearch = getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);

    const shortAddress = '0x12345'; // less than 42 chars
    fireEvent.changeText(tokenSearch, shortAddress);

    // Get the input fields for decimals, symbol, and name
    const decimalsInput = getByTestId('input-token-decimal');
    const symbolInput = getByTestId('input-token-symbol');
    const warningAddress = getByTestId('token-address-warning');

    // Verify the fields are empty
    expect(decimalsInput.props.value).toBe('');
    expect(symbolInput.props.value).toBe('');
    expect(warningAddress).toBeOnTheScreen();
  });

  it('should handle text input callback and reset fields for short address', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken setOpenNetworkSelector={mockSetOpenNetworkSelector} />,
      { state: mockInitialState },
    );

    // First set some initial values (if needed)
    const tokenSearch = getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);

    const shortAddress = '0x12345'; // less than 42 chars
    fireEvent.changeText(tokenSearch, shortAddress);

    // Get the input fields for decimals, symbol, and name
    const decimalsInput = getByTestId('input-token-decimal');
    const symbolInput = getByTestId('input-token-symbol');
    const warningAddress = getByTestId('token-address-warning');

    // Verify the fields are empty
    expect(decimalsInput.props.value).toBe('');
    expect(symbolInput.props.value).toBe('');
    expect(warningAddress).toBeOnTheScreen();
  });

  it('should handle text input callback and reset fields for 42 length address', async () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken setOpenNetworkSelector={mockSetOpenNetworkSelector} />,
      { state: mockInitialState },
    );

    const tokenSearch = getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);

    const fullAddress = '0x1234567890123456789012345678901234567890';
    fireEvent.changeText(tokenSearch, fullAddress);

    // Verify the address was set
    expect(tokenSearch.props.value).toBe(fullAddress);
  });
});
