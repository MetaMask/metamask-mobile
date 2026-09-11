import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  MetaMetricsSwapsEventSource,
  RequestStatus,
} from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import {
  renderBridgeView,
  withBridgeSession,
} from '../../../../../../tests/component-view/renderers/bridge';
import { BridgeSessionProvider } from '../../providers/BridgeSessionProvider';
import { BridgeQuoteDataProvider } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { initialStateBridge } from '../../../../../../tests/component-view/presets/bridge';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import {
  DEFAULT_BRIDGE,
  ETH_SOURCE,
  USDC_DEST,
} from '../../_mocks_/bridgeViewTestConstants';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { PriceImpactModal } from '../../components/PriceImpactModal';
import { PriceImpactModalType } from '../../components/PriceImpactModal/constants';
import { TokenWarningModal } from '../../components/TokenWarningModal';
import { TokenWarningModalMode } from '../../components/TokenWarningModal/constants';
import { MissingPriceModal } from '../../components/MissingPriceModal';
import { SecurityDataType } from '../../types';
import { SwapsBannersSelectorsIDs } from '../../components/SwapsBanners/SwapsBanners.testIds';
import BridgeView from '.';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';

const BRIDGE_VIEW_NATIVE_SOURCE_FETCHES = 2;
const QUOTE_MODAL_NATIVE_SOURCE_FETCHES = 1;

const ModalStack = createNativeStackNavigator();
const ScreensStack = createNativeStackNavigator();

const BridgeModalsRoot = () => (
  <ModalStack.Navigator>
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL}
      component={TokenWarningModal}
    />
  </ModalStack.Navigator>
);

const BridgeViewWithTokenWarningModal = () => (
  <BridgeSessionProvider>
    <BridgeQuoteDataProvider>
      <ScreensStack.Navigator>
        <ScreensStack.Screen
          name={Routes.BRIDGE.BRIDGE_VIEW}
          component={BridgeView}
        />
        <ScreensStack.Screen
          name={Routes.BRIDGE.MODALS.ROOT}
          component={BridgeModalsRoot}
        />
      </ScreensStack.Navigator>
    </BridgeQuoteDataProvider>
  </BridgeSessionProvider>
);

const quotedBridgeControllerState = {
  quotes: [mockQuoteWithMetadata],
  quotesLastFetched: Date.now(),
  quotesLoadingStatus: RequestStatus.FETCHED,
  quoteFetchError: null,
};

const spyEthGetBalance = () => {
  const { NetworkController } = Engine.context;
  const getNetworkClientById =
    NetworkController.getNetworkClientById.bind(NetworkController);
  const ethGetBalance = jest.fn();

  jest.spyOn(NetworkController, 'getNetworkClientById').mockImplementation(((
    id: string,
  ) => {
    const client = getNetworkClientById(id);
    const originalRequest = client.provider.request.bind(client.provider);

    client.provider.request = (async (request: { method: string }) => {
      if (request.method === 'eth_getBalance') {
        ethGetBalance(request);
      }

      return originalRequest(request);
    }) as typeof client.provider.request;

    return client;
  }) as typeof NetworkController.getNetworkClientById);

  return ethGetBalance;
};

const waitForEthGetBalanceCalls = async (
  ethGetBalance: jest.Mock,
  expectedCalls: number,
) => {
  await waitFor(() => {
    expect(ethGetBalance).toHaveBeenCalledTimes(expectedCalls);
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(ethGetBalance).toHaveBeenCalledTimes(expectedCalls);
};

const createBridgeFlowState = () =>
  initialStateBridge({ deterministicFiat: true })
    .withOverrides({ bridge: DEFAULT_BRIDGE })
    .build();

describeForPlatforms('Bridge native source balance fetches', () => {
  let ethGetBalance: jest.Mock;

  beforeEach(() => {
    ethGetBalance = spyEthGetBalance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches native source balance twice when BridgeView mounts with a quote', async () => {
    const { findByTestId } = renderBridgeView({
      deterministicFiat: true,
      overrides: {
        bridge: DEFAULT_BRIDGE,
        engine: {
          backgroundState: {
            BridgeController: quotedBridgeControllerState,
          },
        },
      } as unknown as DeepPartial<RootState>,
    });

    expect(
      await findByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();

    await waitForEthGetBalanceCalls(
      ethGetBalance,
      BRIDGE_VIEW_NATIVE_SOURCE_FETCHES,
    );
  });

  it('does not fetch native source balance again when a quote modal opens over BridgeView', async () => {
    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        bridge: {
          ...DEFAULT_BRIDGE,
          destToken: {
            ...USDC_DEST,
            securityData: {
              type: SecurityDataType.Warning,
              metadata: { features: [] },
            },
          },
        },
        engine: {
          backgroundState: {
            BridgeController: quotedBridgeControllerState,
          },
        },
      } as unknown as DeepPartial<RootState>)
      .build();

    const { findByTestId, findByText, getByTestId } = renderComponentViewScreen(
      BridgeViewWithTokenWarningModal,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );

    expect(
      await findByTestId(SwapsBannersSelectorsIDs.TOKEN_WARNING),
    ).toBeOnTheScreen();

    await waitForEthGetBalanceCalls(
      ethGetBalance,
      BRIDGE_VIEW_NATIVE_SOURCE_FETCHES,
    );

    fireEvent.press(getByTestId(SwapsBannersSelectorsIDs.TOKEN_WARNING));

    expect(
      await findByText(strings('bridge.token_warning_modal_suspicious_title')),
    ).toBeOnTheScreen();

    await waitForEthGetBalanceCalls(
      ethGetBalance,
      BRIDGE_VIEW_NATIVE_SOURCE_FETCHES,
    );
  });

  it.each([
    {
      name: 'PriceImpactModal',
      Component: PriceImpactModal,
      routeName: Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL,
      params: {
        type: PriceImpactModalType.Execution,
        token: ETH_SOURCE,
        location: MetaMetricsSwapsEventSource.MainView,
      },
    },
    {
      name: 'TokenWarningModal',
      Component: TokenWarningModal,
      routeName: Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL,
      params: {
        warningType: SecurityDataType.Warning,
        features: [],
        mode: TokenWarningModalMode.Execution,
        location: MetaMetricsSwapsEventSource.MainView,
      },
    },
    {
      name: 'MissingPriceModal',
      Component: MissingPriceModal,
      routeName: Routes.BRIDGE.MODALS.MISSING_PRICE_MODAL,
      params: {
        location: MetaMetricsSwapsEventSource.MainView,
      },
    },
  ])(
    'fetches native source balance once when $name opens',
    async ({ Component, routeName, params }) => {
      renderComponentViewScreen(
        withBridgeSession(Component),
        { name: routeName },
        { state: createBridgeFlowState() },
        params,
      );

      await waitForEthGetBalanceCalls(
        ethGetBalance,
        QUOTE_MODAL_NATIVE_SOURCE_FETCHES,
      );
    },
  );
});
