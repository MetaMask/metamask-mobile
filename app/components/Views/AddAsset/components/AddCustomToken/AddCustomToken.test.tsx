import React from 'react';
import AddCustomToken from './AddCustomToken';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { act, fireEvent } from '@testing-library/react-native';
import { isSmartContractAddress } from '../../../../../util/transactions';

const mockPush = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      push: mockPush,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../../../../util/transactions', () => ({
  isSmartContractAddress: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20TokenDecimals: jest.fn().mockResolvedValue(18),
      getERC721AssetSymbol: jest.fn().mockResolvedValue('WBTC'),
      getERC20TokenName: jest.fn().mockResolvedValue('Wrapped Bitcoin'),
    },
  },
}));

jest.mock('../../../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'Etherscan', url: 'https://etherscan.io' }),
  getDecimalChainId: jest.fn().mockReturnValue('1'),
  isMainnetByChainId: jest.fn().mockReturnValue(true),
}));

const mockIsSmartContractAddress = isSmartContractAddress as jest.Mock;

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';
const SHORT_ADDRESS = '0x12345';

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

const renderComponent = (props = {}) =>
  renderWithProvider(<AddCustomToken chainId="0x1" {...props} />, {
    state: mockInitialState,
  });

describe('AddCustomToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows address error for an invalid address', () => {
    const { getByTestId } = renderComponent();

    fireEvent.changeText(
      getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
      SHORT_ADDRESS,
    );

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE),
    ).toBeOnTheScreen();
  });

  it('shows address error when address is not a smart contract', async () => {
    mockIsSmartContractAddress.mockResolvedValue(false);

    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE),
    ).toBeOnTheScreen();
  });

  it('fetches and displays token metadata for a valid contract address', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT).props.value,
    ).toBe('WBTC');
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.DECIMAL_INPUT).props.value,
    ).toBe('18');
  });

  it('hides symbol and decimals fields when address becomes invalid', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    const { getByTestId, queryByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        SHORT_ADDRESS,
      );
    });

    expect(queryByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT)).toBeNull();
    expect(queryByTestId(ImportTokenViewSelectorsIDs.DECIMAL_INPUT)).toBeNull();
  });

  it('disables Next button when form is incomplete', () => {
    const { getByTestId } = renderComponent();

    const nextButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    expect(nextButton.props.disabled || nextButton.props.isDisabled).toBe(true);
  });

  it('navigates to ConfirmAddAsset when form is valid and Next is pressed', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON));

    expect(mockPush).toHaveBeenCalledWith(
      'ConfirmAddAsset',
      expect.objectContaining({
        chainId: '0x1',
        selectedAsset: expect.arrayContaining([
          expect.objectContaining({
            address: VALID_ADDRESS,
            symbol: 'WBTC',
            decimals: '18',
          }),
        ]),
      }),
    );
  });
});
