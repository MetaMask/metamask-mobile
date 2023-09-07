import React from 'react';
import { AggregatorNetwork } from '@consensys/on-ramp-sdk/dist/API';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import NetworkSwitcher from './NetworkSwitcher';
import useFetchRampNetworks from '../../hooks/useFetchRampNetworks';
import useRampNetworksDetail from '../../hooks/useRampNetworksDetail';
import { RampSDK } from '../../sdk';
import Routes from '../../../../../../constants/navigation/Routes';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';
import Engine from '../../../../../../core/Engine';

const mockedRampNetworks: AggregatorNetwork[] = [
  {
    active: true,
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    nativeTokenSupported: true,
    shortName: 'Ethereum',
  },
  {
    active: true,
    chainId: 59144,
    chainName: 'Linea Mainnet',
    nativeTokenSupported: true,
    shortName: 'Linea',
  },
  {
    active: true,
    chainId: 25,
    chainName: 'Cronos Mainnet',
    nativeTokenSupported: true,
    shortName: 'Cronos',
  },
  {
    active: true,
    chainId: 137,
    chainName: 'Polygon Mainnet',
    nativeTokenSupported: true,
    shortName: 'Polygon',
  },
  {
    active: false,
    chainId: 56,
    chainName: 'BNB Smart Chain',
    nativeTokenSupported: false,
    shortName: 'BNB Smart Chain',
  },
];

const mockedNetworksDetails = [
  {
    chainId: '25',
    nickname: 'Cronos Mainnet',
    rpcUrl: 'https://evm.cronos.org',
    ticker: 'CRO',
    rpcPrefs: {
      blockExplorerUrl: 'https://cronoscan.com',
      imageUrl:
        'https://static.metafi.codefi.network/api/v1/tokenIcons/42220/0x471ece3750da237f93b8e339c536989b8978a438.png',
    },
  },
];

function render(Component: React.ComponentType, chainId?: string) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.BUY.REGION,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...initialBackgroundState,
            NetworkController: {
              ...initialBackgroundState.NetworkController,
              providerConfig: {
                chainId: chainId ?? '56',
                ticker: 'BNB',
                nickname: 'BNB Smart Chain',
              },
              networkConfigurations: {
                networkId1: {
                  chainId: '137',
                  nickname: 'Polygon Mainnet',
                  rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
                  rpcUrl:
                    'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                  ticker: 'MATIC',
                },
              },
            },
          },
        },
        fiatOrders: {
          networks: mockedRampNetworks,
        },
      },
    },
  );
}

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setProviderType: jest.fn(),
      setActiveNetwork: jest.fn(),
    },
    CurrencyRateController: {
      setNativeCurrency: jest.fn(),
    },
  },
}));

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockPop = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockFetchNetworks = jest.fn();
const mockUseFetchRampNetworksInitialValues: Partial<
  ReturnType<typeof useFetchRampNetworks>
> = [false, undefined, mockFetchNetworks];

let mockUseFetchRampNetworksValues = [...mockUseFetchRampNetworksInitialValues];

jest.mock('../../hooks/useFetchRampNetworks', () =>
  jest.fn(() => mockUseFetchRampNetworksValues),
);

const mockGetNetworksDetail = jest.fn();
const mockUseRampNetworksDetailInitialValues: Partial<
  ReturnType<typeof useRampNetworksDetail>
> = {
  error: undefined,
  isLoading: false,
  getNetworksDetail: mockGetNetworksDetail,
  networksDetails: mockedNetworksDetails,
};

let mockUseRampNetworksDetailValues = {
  ...mockUseRampNetworksDetailInitialValues,
};

jest.mock('../../hooks/useRampNetworksDetail', () =>
  jest.fn(() => mockUseRampNetworksDetailValues),
);

const mockuseRampSDKInitialValues: Partial<RampSDK> = {
  selectedChainId: '56',
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

describe('NetworkSwitcher View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
    (
      mockUseRampNetworksDetailInitialValues.getNetworksDetail as jest.Mock
    ).mockClear();
    mockFetchNetworks.mockClear();
  });

  beforeEach(() => {
    mockUseFetchRampNetworksValues = [...mockUseFetchRampNetworksInitialValues];
    mockUseRampNetworksDetailValues = {
      ...mockUseRampNetworksDetailInitialValues,
    };
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
  });

  it('calls setOptions when rendering', async () => {
    render(NetworkSwitcher);
    expect(mockSetOptions).toBeCalledTimes(1);
  });

  it('renders correctly', async () => {
    render(NetworkSwitcher);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly while loading', async () => {
    mockUseFetchRampNetworksValues = [
      true,
      ...mockUseFetchRampNetworksInitialValues.slice(1),
    ];
    render(NetworkSwitcher);

    expect(screen.toJSON()).toMatchSnapshot();

    mockUseFetchRampNetworksValues = [...mockUseFetchRampNetworksInitialValues];
    mockUseRampNetworksDetailValues = {
      ...mockUseRampNetworksDetailInitialValues,
      isLoading: true,
    };
    render(NetworkSwitcher);

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it.todo('renders correctly with no data');

  it('renders and dismisses network modal when pressing add button', async () => {
    render(NetworkSwitcher);
    const cancelButtons = screen.getAllByText('Cancel');

    expect(cancelButtons.length).toBe(1);

    const selectRegionButton = screen.getByText('Add');
    fireEvent.press(selectRegionButton);
    expect(screen.toJSON()).toMatchSnapshot();

    const cancelButtons2 = screen.getAllByText('Cancel');
    expect(cancelButtons2.length).toBe(2);
    fireEvent.press(cancelButtons2[1]);
    expect(screen.toJSON()).toMatchSnapshot();
    const cancelButtons3 = screen.getAllByText('Cancel');
    expect(cancelButtons3.length).toBe(1);
  });

  it('switches network by calling setProviderType', async () => {
    render(NetworkSwitcher);
    const lineaNetworkText = screen.getByText('Linea Main Network');
    fireEvent.press(lineaNetworkText);
    expect(Engine.context.NetworkController.setProviderType.mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "linea-mainnet",
        ],
      ]
    `);

    render(NetworkSwitcher);
    const polygonNetworkTest = screen.getByText('Polygon Mainnet');
    fireEvent.press(polygonNetworkTest);
    expect(Engine.context.NetworkController.setActiveNetwork.mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "networkId1",
        ],
      ]
    `);
    expect(Engine.context.CurrencyRateController.setNativeCurrency.mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "MATIC",
        ],
      ]
    `);
  });

  it('renders correctly with errors', async () => {
    mockUseFetchRampNetworksValues = [
      mockUseFetchRampNetworksInitialValues[0],
      new Error('Test Error for fetching networks'),
      mockUseFetchRampNetworksInitialValues[2],
    ];

    render(NetworkSwitcher);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText('Test Error for fetching networks')).toBeTruthy();

    mockUseFetchRampNetworksValues = [...mockUseFetchRampNetworksInitialValues];
    mockUseRampNetworksDetailValues = {
      ...mockUseRampNetworksDetailInitialValues,
      error: new Error('Test Error for fetching networks details'),
    };

    render(NetworkSwitcher);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(
      screen.getByText('Test Error for fetching networks details'),
    ).toBeTruthy();
  });

  it('retries fetching networks and details when pressing the error view button', async () => {
    mockUseFetchRampNetworksValues = [
      mockUseFetchRampNetworksInitialValues[0],
      new Error('Test Error for fetching networks'),
      mockUseFetchRampNetworksInitialValues[2],
    ];

    render(NetworkSwitcher);
    const tryAgainButton = screen.getByRole('button', { name: 'Try again' });
    fireEvent.press(tryAgainButton);
    expect(mockFetchNetworks).toBeCalledTimes(1);
    expect(mockGetNetworksDetail).toBeCalledTimes(1);
  });

  it('navigates and tracks event on cancel button press', async () => {
    render(NetworkSwitcher);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '56',
      location: 'Network Switcher Screen',
    });
  });

  it('navigates on supported network', async () => {
    render(NetworkSwitcher, '1');
    expect(mockNavigate.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "GetStarted",
        ],
      ]
    `);
  });
});
