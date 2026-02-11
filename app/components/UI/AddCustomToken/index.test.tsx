import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import { act, fireEvent } from '@testing-library/react-native';
import { isSmartContractAddress } from '../../../util/transactions';
import Engine from '../../../core/Engine';

jest.mock('../../../util/transactions', () => ({
  isSmartContractAddress: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20TokenDecimals: jest.fn().mockResolvedValue(18),
      getERC721AssetSymbol: jest.fn().mockResolvedValue('WBTC'),
      getERC20TokenName: jest.fn().mockResolvedValue('Wrapped Bitcoin'),
    },
  },
}));

const mockIsSmartContractAddress = isSmartContractAddress as jest.Mock;

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

  it('does not display symbol and decimals fields when address changes to short address', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    (
      Engine.context.AssetsContractController.getERC20TokenDecimals as jest.Mock
    ).mockResolvedValue(18);
    (
      Engine.context.AssetsContractController.getERC721AssetSymbol as jest.Mock
    ).mockResolvedValue('WBTC');
    (
      Engine.context.AssetsContractController.getERC20TokenName as jest.Mock
    ).mockResolvedValue('Wrapped Bitcoin');
    const { getByTestId, queryByTestId } = renderWithProvider(
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

    await act(async () => {
      fireEvent.changeText(
        tokenSearch,
        '0x1234567890123456789012345678901234567890',
      );
    });

    const decimalsInput = getByTestId('input-token-decimal');
    const symbolInput = getByTestId('input-token-symbol');

    expect(decimalsInput.props.value).toBe('18');
    expect(symbolInput.props.value).toBe('WBTC');

    await act(async () => {
      fireEvent.changeText(tokenSearch, shortAddress);
    });

    expect(queryByTestId('input-token-decimal')).toBeNull();
    expect(queryByTestId('input-token-symbol')).toBeNull();
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
    mockIsSmartContractAddress.mockResolvedValue(true);
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
