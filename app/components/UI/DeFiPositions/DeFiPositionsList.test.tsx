import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import DeFiPositionsList from './DeFiPositionsList';
import { RootState } from '../../../reducers';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../selectors/defiPositionsController', () => ({
  ...jest.requireActual('../../../selectors/defiPositionsController'),
  selectDeFiPositionsByAddress: jest.fn(),
  selectDefiPositionsByEnabledNetworks: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const MOCK_ADDRESS_1 = '0x0000000000000000000000000000000000000001';

const MOCK_CHAIN_ID_1 = '0x1';
const MOCK_CHAIN_ID_1_CLIENT_ID = 'CHAIN_1_CLIENT_ID';
const MOCK_CHAIN_ID_2 = '0xa';
const MOCK_CHAIN_ID_2_CLIENT_ID = 'CHAIN_2_CLIENT_ID';
const MOCK_CHAIN_ID_3 = '0x2105';
const MOCK_CHAIN_ID_3_CLIENT_ID = 'CHAIN_3_CLIENT_ID';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...backgroundState.AccountsController,
        internalAccounts: {
          ...backgroundState.AccountsController.internalAccounts,
          selectedAccount: MOCK_ADDRESS_1,
          accounts: {
            [MOCK_ADDRESS_1]: {
              address: MOCK_ADDRESS_1,
            },
          },
        },
      },
      NetworkController: {
        ...backgroundState.NetworkController,
        selectedNetworkClientId: MOCK_CHAIN_ID_1_CLIENT_ID,
        networkConfigurationsByChainId: {
          [MOCK_CHAIN_ID_1]: {
            chainId: MOCK_CHAIN_ID_1,
            rpcEndpoints: [
              {
                networkClientId: MOCK_CHAIN_ID_1_CLIENT_ID,
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
          [MOCK_CHAIN_ID_2]: {
            chainId: MOCK_CHAIN_ID_2,
            rpcEndpoints: [
              {
                networkClientId: MOCK_CHAIN_ID_2_CLIENT_ID,
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
          [MOCK_CHAIN_ID_3]: {
            chainId: MOCK_CHAIN_ID_3,
            rpcEndpoints: [
              {
                networkClientId: MOCK_CHAIN_ID_3_CLIENT_ID,
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
      PreferencesController: {
        ...backgroundState.PreferencesController,
        tokenNetworkFilter: {
          [MOCK_CHAIN_ID_1]: 'true',
        },
      },
      DeFiPositionsController: {
        allDeFiPositions: {
          [MOCK_ADDRESS_1]: {
            [MOCK_CHAIN_ID_1]: {
              aggregatedMarketValue: 100,
              protocols: {
                protocol1: {
                  aggregatedMarketValue: 100,
                  protocolDetails: {
                    name: 'Protocol 1',
                  },
                  positionTypes: {
                    stake: {
                      aggregatedMarketValue: 100,
                      positions: [
                        [
                          {
                            address: '0x11',
                            name: 'Protocol Token 1-1',
                            symbol: 'PT11',
                            decimals: 18,
                            balance: 100,
                            balanceRaw: '100',
                            marketValue: 100,
                            type: 'protocol',
                            tokens: [
                              {
                                address: '0x111',
                                name: 'Underlying Token 1-1-1',
                                symbol: 'UT111',
                                decimals: 18,
                                balance: 100,
                                balanceRaw: '100',
                                marketValue: 100,
                                price: 1,
                                type: 'underlying',
                                iconUrl: 'https://example.com/ut111.png',
                              },
                            ],
                          },
                        ],
                      ],
                    },
                  },
                },
              },
            },
            [MOCK_CHAIN_ID_2]: {
              aggregatedMarketValue: 10,
              protocols: {
                protocol1: {
                  aggregatedMarketValue: 10,
                  protocolDetails: {
                    name: 'Protocol 2',
                  },
                  positionTypes: {
                    stake: {
                      aggregatedMarketValue: 10,
                      positions: [
                        [
                          {
                            address: '0x21',
                            name: 'Protocol Token 2-1',
                            symbol: 'PT2',
                            decimals: 18,
                            balance: 10,
                            balanceRaw: '10',
                            marketValue: 10,
                            type: 'protocol',
                            tokens: [
                              {
                                address: '0x211',
                                name: 'Underlying Token 2-1-1',
                                symbol: 'UT211',
                                decimals: 18,
                                balance: 10,
                                balanceRaw: '10',
                                marketValue: 10,
                                price: 1,
                                type: 'underlying',
                                iconUrl: 'https://example.com/ut211.png',
                              },
                            ],
                          },
                        ],
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as unknown as RootState;

describe('DeFiPositionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const allPositions =
      mockInitialState.engine.backgroundState.DeFiPositionsController
        .allDeFiPositions[MOCK_ADDRESS_1] || {};

    const defiPositionsModule = jest.requireMock(
      '../../../selectors/defiPositionsController',
    );
    defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(
      allPositions,
    );
    // Network Manager is now always enabled, so mock returns only enabled chain (0x1)
    defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue({
      [MOCK_CHAIN_ID_1]: allPositions[MOCK_CHAIN_ID_1],
    });
  });

  it('renders protocol name and aggregated value for selected account and chain', async () => {
    const { findByTestId, findByText } = renderWithProvider(
      <DeFiPositionsList tabLabel="DeFi" />,
      {
        state: mockInitialState,
      },
    );

    expect(
      await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER),
    ).toBeOnTheScreen();

    const listContainer = await findByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
    );
    expect(listContainer).toBeOnTheScreen();

    expect(await findByText('Protocol 1')).toBeOnTheScreen();
    expect(await findByText('$100.00')).toBeOnTheScreen();
  });

  it('renders protocol name and aggregated value for all chains when all networks is selected', async () => {
    // Override mock to return all enabled chains
    const allPositions =
      mockInitialState.engine.backgroundState.DeFiPositionsController
        .allDeFiPositions[MOCK_ADDRESS_1] || {};
    const defiPositionsModule = jest.requireMock(
      '../../../selectors/defiPositionsController',
    );
    defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
      allPositions,
    );

    const { findByTestId, findByText } = renderWithProvider(
      <DeFiPositionsList tabLabel="DeFi" />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              PreferencesController: {
                ...mockInitialState.engine.backgroundState
                  .PreferencesController,
                tokenNetworkFilter: {
                  [MOCK_CHAIN_ID_1]: true,
                  [MOCK_CHAIN_ID_2]: true,
                  [MOCK_CHAIN_ID_3]: true,
                },
              },
            },
          },
        },
      },
    );

    expect(
      await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER),
    ).toBeOnTheScreen();

    const listContainer = await findByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
    );
    expect(listContainer).toBeOnTheScreen();

    expect(await findByText('Protocol 1')).toBeOnTheScreen();
    expect(await findByText('Protocol 2')).toBeOnTheScreen();
    expect(await findByText('$100.00')).toBeOnTheScreen();
    expect(await findByText('$10.00')).toBeOnTheScreen();
  });

  it('renders the loading positions message when positions are not yet available', async () => {
    const defiPositionsModule = jest.requireMock(
      '../../../selectors/defiPositionsController',
    );
    defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(undefined);
    defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
      undefined,
    );

    const { queryByTestId, findByText } = renderWithProvider(
      <DeFiPositionsList tabLabel="DeFi" />,
      {
        state: mockInitialState,
      },
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER),
    ).not.toBeOnTheScreen();
    expect(await findByText('Loading DeFi positions...')).toBeOnTheScreen();
  });

  it('renders the error message when the positions fetching failed for that address', async () => {
    const defiPositionsModule = jest.requireMock(
      '../../../selectors/defiPositionsController',
    );
    defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(null);
    defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
      null,
    );

    const { queryByTestId, findByText } = renderWithProvider(
      <DeFiPositionsList tabLabel="DeFi" />,
      {
        state: mockInitialState,
      },
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER),
    ).not.toBeOnTheScreen();
    expect(await findByText(`We could not load this page.`)).toBeOnTheScreen();
    expect(await findByText(`Try visiting again later.`)).toBeOnTheScreen();
  });

  it('renders the no positions message when there are no positions for that chain', async () => {
    const defiPositionsModule = jest.requireMock(
      '../../../selectors/defiPositionsController',
    );
    defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue({});
    defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
      {},
    );

    const { findByTestId, findByText } = renderWithProvider(
      <DeFiPositionsList tabLabel="DeFi" />,
      {
        state: mockInitialState,
      },
    );

    expect(
      await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER),
    ).toBeOnTheScreen();
    expect(
      await findByText(`Lend, borrow, and trade, right in your wallet.`),
    ).toBeOnTheScreen();
    expect(await findByText(`Explore DeFi`)).toBeOnTheScreen();
  });

  describe('Network Manager Integration', () => {
    it('uses defiPositionsByEnabledNetworks selector', async () => {
      const defiPositionsModule = jest.requireMock(
        '../../../selectors/defiPositionsController',
      );

      const mockDefiPositionsByEnabledNetworks = {
        [MOCK_CHAIN_ID_1]: {
          aggregatedMarketValue: 100,
          protocols: {
            protocol1: {
              aggregatedMarketValue: 100,
              protocolDetails: {
                name: 'Protocol 1 (Filtered)',
              },
              positionTypes: {
                stake: {
                  aggregatedMarketValue: 100,
                  positions: [
                    [
                      {
                        address: '0x11',
                        name: 'Protocol Token 1-1',
                        symbol: 'PT11',
                        decimals: 18,
                        balance: 100,
                        balanceRaw: '100',
                        marketValue: 100,
                        type: 'protocol',
                        tokens: [
                          {
                            address: '0x111',
                            name: 'Underlying Token 1-1-1',
                            symbol: 'UT111',
                            decimals: 18,
                            balance: 100,
                            balanceRaw: '100',
                            marketValue: 100,
                            price: 1,
                            type: 'underlying',
                            iconUrl: 'https://example.com/ut111.png',
                          },
                        ],
                      },
                    ],
                  ],
                },
              },
            },
          },
        },
      };

      defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
        mockDefiPositionsByEnabledNetworks,
      );
      defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(
        mockInitialState.engine.backgroundState.DeFiPositionsController
          .allDeFiPositions[MOCK_ADDRESS_1],
      );

      const { findByTestId, findByText } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: mockInitialState,
        },
      );

      expect(
        await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER),
      ).toBeOnTheScreen();

      const listContainer = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(listContainer).toBeOnTheScreen();

      expect(await findByText('Protocol 1 (Filtered)')).toBeOnTheScreen();
      expect(await findByText('$100.00')).toBeOnTheScreen();
    });

    it('shows no positions when defiPositionsByEnabledNetworks returns empty data', async () => {
      const defiPositionsModule = jest.requireMock(
        '../../../selectors/defiPositionsController',
      );
      defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
        {},
      );
      defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(
        mockInitialState.engine.backgroundState.DeFiPositionsController
          .allDeFiPositions[MOCK_ADDRESS_1],
      );

      const { findByTestId, findByText } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: mockInitialState,
        },
      );

      expect(
        await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        await findByTestId(
          WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
        ),
      ).toBeOnTheScreen();
      expect(
        await findByText(`Lend, borrow, and trade, right in your wallet.`),
      ).toBeOnTheScreen();
      expect(await findByText(`Explore DeFi`)).toBeOnTheScreen();
    });

    it('shows control bar with enabled networks text', async () => {
      const defiPositionsModule = jest.requireMock(
        '../../../selectors/defiPositionsController',
      );
      const singleProtocolData = {
        [MOCK_CHAIN_ID_1]: {
          aggregatedMarketValue: 100,
          protocols: {
            protocol1: {
              aggregatedMarketValue: 100,
              protocolDetails: {
                name: 'Protocol 1',
              },
              positionTypes: {
                stake: {
                  aggregatedMarketValue: 100,
                  positions: [
                    [
                      {
                        address: '0x11',
                        name: 'Protocol Token 1-1',
                        symbol: 'PT11',
                        decimals: 18,
                        balance: 100,
                        balanceRaw: '100',
                        marketValue: 100,
                        type: 'protocol',
                        tokens: [
                          {
                            address: '0x111',
                            name: 'Underlying Token 1-1-1',
                            symbol: 'UT111',
                            decimals: 18,
                            balance: 100,
                            balanceRaw: '100',
                            marketValue: 100,
                            price: 1,
                            type: 'underlying',
                            iconUrl: 'https://example.com/ut111.png',
                          },
                        ],
                      },
                    ],
                  ],
                },
              },
            },
          },
        },
      };

      defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
        singleProtocolData,
      );
      defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(
        singleProtocolData,
      );

      const { findByTestId, findByText } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: mockInitialState,
        },
      );

      expect(
        await findByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        await findByTestId(
          WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
        ),
      ).toBeOnTheScreen();

      const listContainer = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(listContainer).toBeOnTheScreen();

      expect(await findByText('Protocol 1')).toBeOnTheScreen();
      expect(await findByText('$100.00')).toBeOnTheScreen();
    });
  });

  describe('Homepage Redesign V1 Feature', () => {
    it('removes scrolling container in favour of global scroll container when isHomepageRedesignV1Enabled is true', async () => {
      const { findByTestId, queryByTestId } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: {
            ...mockInitialState,
            engine: {
              ...mockInitialState.engine,
              backgroundState: {
                ...mockInitialState.engine.backgroundState,
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    homepageRedesignV1: {
                      enabled: true,
                      minimumVersion: '1.0.0',
                    },
                  },
                  cacheTimestamp: 0,
                },
              },
            },
          },
        },
      );

      const container = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
      );
      expect(container).toBeOnTheScreen();

      const listContainer = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(listContainer).toBeOnTheScreen();

      const scrollView = queryByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
      );
      expect(scrollView).toBeNull();
    });

    it('renders empty state without scroll container when isHomepageRedesignV1Enabled is true', async () => {
      const defiPositionsModule = jest.requireMock(
        '../../../selectors/defiPositionsController',
      );
      defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue({});
      defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
        {},
      );

      const { findByTestId } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: {
            ...mockInitialState,
            engine: {
              ...mockInitialState.engine,
              backgroundState: {
                ...mockInitialState.engine.backgroundState,
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    homepageRedesignV1: {
                      enabled: true,
                      minimumVersion: '1.0.0',
                    },
                  },
                  cacheTimestamp: 0,
                },
              },
            },
          },
        },
      );

      const container = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
      );
      expect(container).toBeOnTheScreen();
    });

    it('renders multiple positions without scroll container when isHomepageRedesignV1Enabled is true', async () => {
      // Override mock to return both enabled chains
      const allPositions =
        mockInitialState.engine.backgroundState.DeFiPositionsController
          .allDeFiPositions[MOCK_ADDRESS_1] || {};
      const defiPositionsModule = jest.requireMock(
        '../../../selectors/defiPositionsController',
      );
      defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue({
        [MOCK_CHAIN_ID_1]: allPositions[MOCK_CHAIN_ID_1],
        [MOCK_CHAIN_ID_2]: allPositions[MOCK_CHAIN_ID_2],
      });

      const { findByTestId, findByText, queryByTestId } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: {
            ...mockInitialState,
            engine: {
              ...mockInitialState.engine,
              backgroundState: {
                ...mockInitialState.engine.backgroundState,
                PreferencesController: {
                  ...mockInitialState.engine.backgroundState
                    .PreferencesController,
                  tokenNetworkFilter: {
                    [MOCK_CHAIN_ID_1]: true,
                    [MOCK_CHAIN_ID_2]: true,
                  },
                },
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    homepageRedesignV1: {
                      enabled: true,
                      minimumVersion: '1.0.0',
                    },
                  },
                  cacheTimestamp: 0,
                },
              },
            },
          },
        },
      );

      const listContainer = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(listContainer).toBeOnTheScreen();

      expect(await findByText('Protocol 1')).toBeOnTheScreen();
      expect(await findByText('Protocol 2')).toBeOnTheScreen();

      const scrollView = queryByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
      );
      expect(scrollView).toBeNull();
    });

    it('renders scroll container when isHomepageRedesignV1Enabled is false', async () => {
      const { findByTestId } = renderWithProvider(
        <DeFiPositionsList tabLabel="DeFi" />,
        {
          state: mockInitialState,
        },
      );

      const listContainer = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(listContainer).toBeOnTheScreen();

      const scrollView = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
      );
      expect(scrollView).toBeOnTheScreen();
    });
  });
});
