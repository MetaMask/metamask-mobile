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

jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'test-network', url: 'https://test-2.com/' }),
  isMainnetByChainId: jest.fn().mockReturnValue(true),
}));

describe('AddCustomToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with required props', () => {
    const { toJSON } = renderWithProvider(
      <AddCustomToken
        chainId={'0x1'}
        networkName="Ethereum Mainnet"
        selectedNetwork="Ethereum Mainnet"
        networkClientId="mainnet"
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays warning for short address', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken
        chainId={'0x1'}
        networkName="Ethereum Mainnet"
        selectedNetwork="Ethereum Mainnet"
        networkClientId="mainnet"
      />,
      { state: mockInitialState },
    );

    const tokenSearch = getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);
    const shortAddress = '0x12345';

    fireEvent.changeText(tokenSearch, shortAddress);

    const warningAddress = getByTestId('token-address-warning');

    expect(warningAddress).toBeOnTheScreen();
  });

  it('clears symbol and decimals fields when address changes to short address', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken
        chainId={'0x1'}
        networkName="Ethereum Mainnet"
        selectedNetwork="Ethereum Mainnet"
        networkClientId="mainnet"
      />,
      { state: mockInitialState },
    );

    const tokenSearch = getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);
    const shortAddress = '0x12345';

    fireEvent.changeText(tokenSearch, shortAddress);

    const decimalsInput = getByTestId('input-token-decimal');
    const symbolInput = getByTestId('input-token-symbol');

    expect(decimalsInput.props.value).toBe('');
    expect(symbolInput.props.value).toBe('');
  });

  it('accepts 42 character address', async () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken
        chainId={'0x1'}
        networkName="Ethereum Mainnet"
        selectedNetwork="Ethereum Mainnet"
        networkClientId="mainnet"
      />,
      { state: mockInitialState },
    );

    const tokenSearch = getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);
    const fullAddress = '0x1234567890123456789012345678901234567890';

    fireEvent.changeText(tokenSearch, fullAddress);

    expect(tokenSearch.props.value).toBe(fullAddress);
  });

  it('disables next button when selectedNetwork is null', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomToken
        chainId={'0x1'}
        networkName="Ethereum Mainnet"
        selectedNetwork={null}
        networkClientId="mainnet"
      />,
      { state: mockInitialState },
    );

    const nextButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);

    expect(nextButton.props.disabled || nextButton.props.isDisabled).toBe(true);
  });
});
