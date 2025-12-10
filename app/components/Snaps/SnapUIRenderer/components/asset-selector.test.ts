import { AssetSelector, Box, Field } from '@metamask/snaps-sdk/jsx';
import { renderInterface } from '../testUtils';
import { act, fireEvent, within } from '@testing-library/react-native';

jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));

describe('SnapUIAssetSelector', () => {
  const mockBalances = {
    '8c33fc18-6c52-44b1-b8fa-550b934a05ef': {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105': {
        amount: '1',
        unit: 'SOL',
      },
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        {
          amount: '2',
          unit: 'USDC',
        },
    },
  };

  const mockAccountsAssets = {
    '8c33fc18-6c52-44b1-b8fa-550b934a05ef': [
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    ],
  };

  const mockAssetsMetadata = {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105': {
      fungible: true,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      name: 'Solana',
      symbol: 'SOL',
      units: [
        {
          decimals: 9,
          name: 'Solana',
          symbol: 'SOL',
        },
      ],
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
      {
        fungible: true,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
        name: 'USDC',
        symbol: 'USDC',
        units: [
          {
            decimals: 9,
            name: 'USDC',
            symbol: 'USDC',
          },
        ],
      },
  };

  const mockConversionRates = {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105': {
      conversionTime: 1745405595549,
      currency: 'swift:0/iso4217:USD',
      expirationTime: 1745409195549,
      rate: '151.36',
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
      {
        conversionTime: 1745405595549,
        currency: 'swift:0/iso4217:USD',
        expirationTime: 1745409195549,
        rate: '1.00',
      },
  };

  const mockState = {
    CurrencyRateController: {
      currentCurrency: 'USD',
    },
    MultichainBalancesController: {
      balances: mockBalances,
    },
    MultichainAssetsController: {
      accountsAssets: mockAccountsAssets,
      assetsMetadata: mockAssetsMetadata,
    },
    MultichainAssetsRatesController: {
      conversionRates: mockConversionRates,
    },
    KeyringController: {
      keyrings: [
        {
          type: 'Snap Keyring',
          accounts: ['7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv'],
        },
      ],
    },
    AccountsController: {
      internalAccounts: {
        accounts: {
          '8c33fc18-6c52-44b1-b8fa-550b934a05ef': {
            address: '7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv',
            id: '8c33fc18-6c52-44b1-b8fa-550b934a05ef',
          },
        },
      },
    },
    MultichainNetworkController: {
      multichainNetworkConfigurationsByChainId: {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
          isEvm: false,
          nativeCurrency: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105',
          name: 'Solana',
        },
      },
      selectedMultichainNetworkChainId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
    PreferencesController: {
      isIpfsGatewayEnabled: false,
    },
  };

  const mockInterfaceState = {
    'asset-selector': {
      asset: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105',
      name: 'Solana',
      symbol: 'SOL',
    },
  };

  const mockSolanaAddress =
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv';
  const mockChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

  it('should render', () => {
    const { getByTestId, toJSON } = renderInterface(
      Box({
        children: AssetSelector({
          name: 'asset-selector',
          addresses: [mockSolanaAddress],
          chainIds: [mockChainId],
        }),
      }),
      { state: mockInterfaceState, backgroundState: mockState },
    );

    expect(getByTestId('snap-ui-renderer__selector')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('can be disabled', () => {
    const { getByTestId } = renderInterface(
      Box({
        children: AssetSelector({
          name: 'asset-selector',
          addresses: [mockSolanaAddress],
          chainIds: [mockChainId],
          disabled: true,
        }),
      }),
      { state: mockInterfaceState, backgroundState: mockState },
    );

    const selector = getByTestId('snap-ui-renderer__selector');

    expect(selector.props.disabled).toBe(true);
  });

  it('can switch assets', async () => {
    const { getByTestId, getAllByTestId, queryByText } = renderInterface(
      Box({
        children: AssetSelector({
          name: 'asset-selector',
          addresses: [mockSolanaAddress],
          chainIds: [mockChainId],
        }),
      }),
      { state: mockInterfaceState, backgroundState: mockState },
    );

    const selectorButton = getByTestId('snap-ui-renderer__selector');
    await act(async () => {
      fireEvent.press(selectorButton);
    });

    const options = getAllByTestId('snap-ui-renderer__selector-item');
    expect(options.length).toBe(2);

    await act(async () => {
      fireEvent.press(options[1]);
    });

    const usdcNameOnButton = await within(selectorButton).findByText('USDC');
    expect(usdcNameOnButton).toBeTruthy();

    const solanaNetworkOnButton =
      await within(selectorButton).findByText('Solana');
    expect(solanaNetworkOnButton).toBeTruthy();

    const solSymbolOnButton = queryByText('SOL');
    expect(solSymbolOnButton).toBeNull();
  });

  it('renders inside a field', () => {
    const { getByText } = renderInterface(
      Box({
        children: Field({
          label: 'Asset Selector',
          children: AssetSelector({
            name: 'asset-selector',
            addresses: [mockSolanaAddress],
            chainIds: [mockChainId],
          }),
        }),
      }),
      { state: mockInterfaceState, backgroundState: mockState },
    );

    expect(getByText('Asset Selector')).toBeTruthy();
  });

  it('can show an error', () => {
    const { getByText } = renderInterface(
      Box({
        children: Field({
          children: AssetSelector({
            name: 'asset-selector',
            addresses: [mockSolanaAddress],
            chainIds: [mockChainId],
          }),
          error: 'Error message',
        }),
      }),
      { state: mockInterfaceState, backgroundState: mockState },
    );

    expect(getByText('Error message')).toBeTruthy();
  });
});
