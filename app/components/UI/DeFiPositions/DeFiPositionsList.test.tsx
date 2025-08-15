import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import DeFiPositionsList from './DeFiPositionsList';
import { RootState } from '../../../reducers';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn().mockReturnValue(false),
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

    const defiPositionsModule = jest.requireMock(
      '../../../selectors/defiPositionsController',
    );
    defiPositionsModule.selectDeFiPositionsByAddress.mockReturnValue(
      mockInitialState.engine.backgroundState.DeFiPositionsController
        .allDeFiPositions[MOCK_ADDRESS_1],
    );
    defiPositionsModule.selectDefiPositionsByEnabledNetworks.mockReturnValue(
      mockInitialState.engine.backgroundState.DeFiPositionsController
        .allDeFiPositions[MOCK_ADDRESS_1],
    );
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
    expect(await findByText('Protocol 1')).toBeOnTheScreen();
    expect(await findByText('$100.00')).toBeOnTheScreen();

    const flatList = await findByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
    );
    expect(flatList.props.data.length).toEqual(1);
  });

  it('renders protocol name and aggregated value for all chains when all networks is selected', async () => {
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
                  [MOCK_CHAIN_ID_1]: 'true',
                  [MOCK_CHAIN_ID_2]: 'true',
                  [MOCK_CHAIN_ID_3]: 'true',
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
    expect(await findByText('Protocol 1')).toBeOnTheScreen();
    expect(await findByText('Protocol 2')).toBeOnTheScreen();
    expect(await findByText('$100.00')).toBeOnTheScreen();
    expect(await findByText('$10.00')).toBeOnTheScreen();
    const flatList = await findByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
    );
    expect(flatList.props.data.length).toEqual(2);
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
      await findByText(`Can't find what you're looking for?`),
    ).toBeOnTheScreen();
    expect(
      await findByText(`We may not support your protocol yet.`),
    ).toBeOnTheScreen();
  });

  describe('when isRemoveGlobalNetworkSelectorEnabled is true', () => {
    beforeEach(() => {
      const networksModule = jest.requireMock('../../../util/networks');
      networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
    });

    it('uses defiPositionsByEnabledNetworks selector when feature flag is enabled', async () => {
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

      // Should show the filtered protocol name
      expect(await findByText('Protocol 1 (Filtered)')).toBeOnTheScreen();
      expect(await findByText('$100.00')).toBeOnTheScreen();

      const flatList = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(flatList.props.data.length).toEqual(1);
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
        await findByText(`Can't find what you're looking for?`),
      ).toBeOnTheScreen();
    });

    it('shows control bar with enabled networks text when feature flag is enabled', async () => {
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

      expect(await findByText('Protocol 1')).toBeOnTheScreen();
      expect(await findByText('$100.00')).toBeOnTheScreen();

      const flatList = await findByTestId(
        WalletViewSelectorsIDs.DEFI_POSITIONS_LIST,
      );
      expect(flatList.props.data.length).toEqual(1);
    });
  });
});
