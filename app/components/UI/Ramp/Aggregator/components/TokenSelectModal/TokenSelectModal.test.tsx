import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import TokenSelectModal from './TokenSelectModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { RampSDK } from '../../sdk';
import { RampType } from '../../types';
import { mockNetworkState } from '../../../../../../util/test/network';

const mockTokens = [
  {
    id: 'eth-1',
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    logo: 'https://example.com/eth.png',
    network: {
      chainId: 1,
      shortName: 'Ethereum',
    },
  },
  {
    id: 'polygon-token',
    symbol: 'POL',
    name: 'Polygon Token',
    address: '0x456',
    logo: 'https://example.com/pol.png',
    network: {
      chainId: 137,
      shortName: 'Polygon',
    },
  },
];

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.TOKEN_SELECTOR,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            NetworkController: {
              ...mockNetworkState({
                chainId: '0x1',
                id: 'mainnet',
                nickname: 'Ethereum Mainnet',
                ticker: 'ETH',
              }),
            },
          },
        },
      },
    },
  );
}

const mockSetSelectedAsset = jest.fn();
const mockSetActiveNetwork = jest.fn();

const mockEngineContext = {
  MultichainNetworkController: {
    setActiveNetwork: mockSetActiveNetwork,
  },
};

jest.mock('../../../../../../core/Engine', () => ({
  get context() {
    return mockEngineContext;
  },
}));

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  setSelectedAsset: mockSetSelectedAsset,
  selectedChainId: '1',
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

// Mock the network configurations selector
const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    rpcEndpoints: [
      {
        networkClientId: 'mainnet',
        type: 'infura',
      },
    ],
    defaultRpcEndpointIndex: 0,
  },
  'eip155:137': {
    chainId: '0x89',
    rpcEndpoints: [
      {
        networkClientId: 'polygon-mainnet',
        type: 'custom',
      },
    ],
    defaultRpcEndpointIndex: 0,
  },
};

jest.mock('../../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../../selectors/networkController'),
  selectNetworkConfigurationsByCaipChainId: () => mockNetworkConfigurations,
}));

describe('TokenSelectModal', () => {
  afterEach(() => {
    mockSetSelectedAsset.mockClear();
    mockSetActiveNetwork.mockClear();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseParams.mockReturnValue({ tokens: mockTokens });
  });

  it('renders the modal with token list', () => {
    const { toJSON } = render(TokenSelectModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
