import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import NFTView from './NFTView';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
  },
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => chainId.startsWith('solana:'),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock' })),
}));

const mockNetworkConfigurations = {
  '0x1': {
    chainId: '0x1' as Hex,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    isEvm: true,
    rpcEndpoints: [{ networkClientId: 'mainnet' }],
  },
} as unknown as Record<string, MultichainNetworkConfiguration>;

const buildState = (displayNftMedia: boolean) => ({
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        displayNftMedia,
      },
    },
  },
});

const defaultProps = {
  collectibleContract: undefined,
  selectedNetwork: '0x1' as Hex,
  openNetworkSelector: jest.fn(),
  networkConfigurations: mockNetworkConfigurations,
};

const renderComponent = (
  overrides: Partial<
    Omit<typeof defaultProps, 'selectedNetwork'> & {
      selectedNetwork: SupportedCaipChainId | Hex | null;
    }
  > = {},
  displayNftMedia = true,
) =>
  renderWithProvider(<NFTView {...defaultProps} {...overrides} />, {
    state: buildState(displayNftMedia),
  });

describe('NFTView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows warning banner when NFT media display is enabled', () => {
    const { getByTestId } = renderComponent({}, true);
    expect(getByTestId('warning-display-media-enabled-text')).toBeOnTheScreen();
  });

  it('shows info banner with action button when NFT media display is disabled', () => {
    const { queryByTestId } = renderComponent({}, false);
    expect(queryByTestId('warning-display-media-enabled-text')).toBeNull();
  });

  it('navigates to NFT display settings when banner CTA is pressed', () => {
    const { getByText } = renderComponent({}, false);

    fireEvent.press(getByText('Turn on Display NFT media'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA,
    });
  });

  it('renders AddCustomCollectible when an EVM network is selected', () => {
    const { getByText } = renderComponent({ selectedNetwork: '0x1' as Hex });
    expect(getByText('Address')).toBeOnTheScreen();
  });

  it('does not render AddCustomCollectible when no network is selected', () => {
    const { queryByText } = renderComponent({ selectedNetwork: null });
    expect(queryByText('Address')).toBeNull();
  });

  it('does not render AddCustomCollectible for non-EVM chains', () => {
    const { queryByText } = renderComponent({
      selectedNetwork: 'solana:mainnet' as unknown as Hex,
    });
    expect(queryByText('Address')).toBeNull();
  });
});
