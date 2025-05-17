import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import AddCustomCollectible from './index';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { NFTImportScreenSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportNFTView.selectors';
import { isSmartContractAddress } from '../../../util/transactions';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  })),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      isNftOwner: jest.fn(),
      addNft: jest.fn(),
    },
  },
}));

jest.mock('../../../util/transactions', () => ({
  isSmartContractAddress: jest.fn(),
}));

const selectedAddress = '0x123';
const validContractAddress = '0x1234567890123456789012345678901234567890';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        accounts: {
          [selectedAddress]: {
            address: selectedAddress,
            balance: '0x0',
          },
        },
        selectedAccount: selectedAddress,
        internalAccounts: {
          accounts: {
            [selectedAddress]: {
              id: selectedAddress,
              address: selectedAddress,
              name: 'Account 1',
              type: 'eip155:e:1',
            },
          },
          selectedAccount: selectedAddress,
        },
      },
      NetworkController: {
        providerConfig: {
          chainId: '0x1',
        },
      },
    },
  },
};

const renderComponent = (state = {}, props = {}) =>
  renderWithProvider(<AddCustomCollectible {...props} />, {
    state,
  });

describe('AddCustomCollectible', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    jest.clearAllMocks();
    (Engine.context.NftController.isNftOwner as jest.Mock).mockResolvedValue(
      true,
    );
    (Engine.context.NftController.addNft as jest.Mock).mockResolvedValue(
      undefined,
    );
    (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
  });

  it('renders correctly with initial state', () => {
    const { getByTestId } = renderComponent(initialState);
    expect(getByTestId(NFTImportScreenSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(
      getByTestId(NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX),
    ).toBeTruthy();
    expect(
      getByTestId(NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX),
    ).toBeTruthy();
  });

  it('validates empty address', async () => {
    const { getByTestId } = renderComponent(initialState);
    const addressInput = getByTestId(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );

    await act(async () => {
      fireEvent(addressInput, 'blur');
    });

    expect(
      getByTestId(NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE),
    ).toHaveTextContent(strings('collectible.address_cant_be_empty'));
  });

  it('validates empty token ID', async () => {
    const { getByTestId } = renderComponent(initialState);
    const tokenIdInput = getByTestId(
      NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX,
    );

    await act(async () => {
      fireEvent(tokenIdInput, 'blur');
    });

    expect(
      getByTestId(NFTImportScreenSelectorsIDs.IDENTIFIER_WARNING_MESSAGE),
    ).toHaveTextContent(strings('collectible.token_id_cant_be_empty'));
  });

  it('handles pre-filled contract address', () => {
    const collectibleContract = { address: validContractAddress };
    const { getByTestId } = renderComponent(initialState, {
      collectibleContract,
    });

    const addressInput = getByTestId(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );
    expect(addressInput.props.value).toBe(validContractAddress);
  });
});
