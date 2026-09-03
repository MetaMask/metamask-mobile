import '../../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
  waitFor,
} from '@testing-library/react-native';
import type {
  ChaseOrder,
  Order,
  PriceUpdate,
  TwapOrder,
  TwapOrderFill,
} from '@metamask/perps-controller';
import { Platform } from 'react-native';
import { renderPerpsProMarketView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../../../../tests/component-view/platform';
import {
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import Logger from '../../../../../util/Logger';
import { analytics } from '../../../../../util/analytics/analytics';
import { PerpsConnectionManager } from '../../services/PerpsConnectionManager';
import { PerpsCacheInvalidator } from '../../services/PerpsCacheInvalidator';
import { PERPS_TWAP_UI_CONFIG } from '../../constants/perpsConfig';
import { resetPerpsChaseOrdersStoreForTests } from '../../hooks/usePerpsChaseOrders';
import {
  isChaseOrderHandleVisible,
  resetChaseOrderVisibilityForTests,
} from '../../services/ChaseOrderVisibility';
import {
  PerpsBalanceBottomSheetSelectorsIDs,
  PerpsModeToggleSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  getPerpsProChaseDistanceSelector,
  getPerpsProChaseRepriceSelector,
  getPerpsProChaseRowSelector,
  getPerpsProChaseSideFilterOptionSelector,
  getPerpsProChaseStatusSelector,
  getPerpsProChaseTerminateSelector,
  getPerpsProTwapFillValueSelector,
  getPerpsProTwapSideFilterOptionSelector,
  getPerpsProTwapTerminateSelector,
  getPerpsProTwapValueSelector,
} from '../../Perps.testIds';
import { formatProOrderCardTimestamp } from '../../utils/formatUtils';

const ids = PerpsProOrderFormSelectorsIDs;
const TIMEOUT_MS = 5000;
const activeChase: ChaseOrder = {
  handle: 'chase-view-1',
  symbol: 'ETH',
  side: 'buy',
  originalSize: '1',
  remainingSize: '1',
  arrivalPrice: '2500',
  restingPrice: '2500.1',
  restingOrderId: '55',
  distanceChasedBps: 1,
  maxDistanceBps: 5,
  repricings: 0,
  startedAt: 1,
  status: 'active',
};
const activeTwap: TwapOrder = {
  orderId: 'twap-view-1',
  symbol: 'ETH',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '10000',
  averagePrice: '2500',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 60_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_000,
  lastUpdated: 2_000,
  fills: [],
  providerId: 'hyperliquid',
};
const completeTwapFill: TwapOrderFill = {
  fillId: 'fill-view-1',
  orderId: activeTwap.orderId,
  side: 'buy',
  price: '2500',
  size: '1.5',
  fee: '0.5',
  feeToken: 'USDC',
  timestamp: 1_700_000_100_000,
  transactionHash: '0xabc',
};
const completeTwap: TwapOrder = {
  ...activeTwap,
  providerId: 'myx',
  randomize: true,
  reduceOnly: true,
  startedAt: 1_700_000_000_000,
  fills: [completeTwapFill],
};
const triggeredOrderTypeIDs = [
  PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
  PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
  PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
  PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
] as const;

let connectionReadySpy: jest.SpyInstance;
let connectionSubscriptionSpy: jest.SpyInstance;
const issuedTwapReadPromises = new Set<Promise<TwapOrder[]>>();
const activeTwapSubscriptions = new Set<symbol>();
const settledChaseReadPromises = new Set<Promise<ChaseOrder[]>>();
type TwapSubscriptionCallback = Parameters<
  typeof Engine.context.PerpsController.subscribeToTwapOrders
>[0]['callback'];

const trackTwapRead = (promise: Promise<TwapOrder[]>): Promise<TwapOrder[]> => {
  issuedTwapReadPromises.add(promise);
  return promise;
};

const mockTwapOrders = (orders: TwapOrder[]) => {
  jest
    .mocked(Engine.context.PerpsController.getTwapOrders)
    .mockImplementation(() => trackTwapRead(Promise.resolve(orders)));
};

const mockTwapOrdersFailure = (error: Error) => {
  jest
    .mocked(Engine.context.PerpsController.getTwapOrders)
    .mockImplementation(() => trackTwapRead(Promise.reject(error)));
};

const mockNextTwapOrdersFailure = (error: Error) => {
  jest
    .mocked(Engine.context.PerpsController.getTwapOrders)
    .mockImplementationOnce(() => trackTwapRead(Promise.reject(error)));
};

const mockTwapOrderSubscription = (
  onSubscribe?: (callback: TwapSubscriptionCallback) => void,
) => {
  jest
    .mocked(Engine.context.PerpsController.subscribeToTwapOrders)
    .mockImplementation(({ callback }) => {
      const subscription = Symbol('twap-subscription');
      activeTwapSubscriptions.add(subscription);
      onSubscribe?.(callback);

      return () => {
        activeTwapSubscriptions.delete(subscription);
      };
    });
};

const settleIssuedTwapReads = async () => {
  while (issuedTwapReadPromises.size > 0) {
    const issuedReads = [...issuedTwapReadPromises];
    issuedReads.forEach((promise) => issuedTwapReadPromises.delete(promise));
    await act(async () => {
      await Promise.allSettled(issuedReads);
    });
  }
};

const settleIssuedChaseReads = async () => {
  while (true) {
    const issuedReads = jest
      .mocked(Engine.context.PerpsController.getChaseOrders)
      .mock.results.map((result) => result.value as Promise<ChaseOrder[]>)
      .filter(
        (promise): promise is Promise<ChaseOrder[]> =>
          Boolean(promise?.then) && !settledChaseReadPromises.has(promise),
      );
    if (issuedReads.length === 0) {
      return;
    }
    issuedReads.forEach((promise) => settledChaseReadPromises.add(promise));
    await act(async () => {
      await Promise.allSettled(issuedReads);
    });
  }
};

const openChaseManagementTab = async () => {
  await screen.findByTestId(
    PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_CHASE,
  );
  // Rollout-off discovery updates the shared Chase store and replaces the tab
  // node. Drain that read and reacquire the live node before pressing it.
  await settleIssuedChaseReads();
  fireEvent.press(
    screen.getByTestId(
      PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_CHASE,
    ),
  );
  await screen.findByTestId(PerpsProMarketViewSelectorsIDs.CHASE_ACTIVE_FILTER);
  await settleIssuedChaseReads();
};

const openTwapManagementTab = async () => {
  await screen.findByTestId(
    PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_TWAP,
  );
  // Rollout-off discovery inserts the tab asynchronously. Drain that read and
  // reacquire the current tab node so the press cannot target the instance
  // replaced by the discovery render.
  await settleIssuedTwapReads();
  fireEvent.press(
    screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_TWAP),
  );
  await screen.findByTestId(
    PerpsProMarketViewSelectorsIDs.TWAP_VIEW_TAB_ACTIVE,
  );
  await settleIssuedTwapReads();
};

const resetPerpsControllerMocks = () => {
  jest
    .mocked(Engine.context.PerpsController.getOrderCapabilities)
    .mockReset()
    .mockResolvedValue({
      status: 'unavailable',
      providerId: 'hyperliquid',
      reason: 'strategy_market_unsupported',
    });
  jest
    .mocked(Engine.context.PerpsController.getChaseOrders)
    .mockReset()
    .mockResolvedValue([]);
  jest.mocked(Engine.context.PerpsController.getTwapOrders).mockReset();
  mockTwapOrders([]);
  jest.mocked(Engine.context.PerpsController.subscribeToTwapOrders).mockReset();
  mockTwapOrderSubscription();
  jest
    .mocked(Engine.context.PerpsController.cancelOrder)
    .mockReset()
    .mockResolvedValue({ success: true });
  jest
    .mocked(Engine.context.PerpsController.getOrders)
    .mockReset()
    .mockResolvedValue([]);
  jest
    .mocked(Engine.context.PerpsController.placeOrder)
    .mockReset()
    .mockResolvedValue({
      success: true,
      orderId: 'component-view-order',
    });
  jest
    .mocked(Engine.context.PerpsController.validateOrder)
    .mockReset()
    .mockResolvedValue({ isValid: true });
};

beforeEach(() => {
  issuedTwapReadPromises.clear();
  activeTwapSubscriptions.clear();
  settledChaseReadPromises.clear();
  resetPerpsChaseOrdersStoreForTests();
  resetChaseOrderVisibilityForTests();
  PerpsCacheInvalidator._clearAllSubscribers();
  resetPerpsControllerMocks();
  connectionReadySpy = jest
    .spyOn(PerpsConnectionManager, 'isSelectedUserContextReady')
    .mockReturnValue(true);
  connectionSubscriptionSpy = jest
    .spyOn(PerpsConnectionManager, 'subscribeToInitializedUserContext')
    .mockImplementation(() => () => undefined);
});

afterEach(async () => {
  try {
    // This is deliberately universal rather than scoped to the platform
    // describe: every render mounts TWAP discovery, including header-only
    // journeys. Unmount first to clear real intervals and subscriptions, then
    // drain every controller read (including reads issued by a prior read's
    // React continuation).
    cleanup();
    // React Native Testing Library cannot safely overlap async act scopes.
    // Settle the independent discovery pipelines serially so teardown cannot
    // unmount the next test's renderer through a corrupted shared act stack.
    await settleIssuedTwapReads();
    await settleIssuedChaseReads();

    // Failure-sensitive isolation guards: a leaking discovery read or
    // subscription is attributed to the journey that created it instead of
    // timing out an unrelated test later in the file.
    expect(issuedTwapReadPromises.size).toBe(0);
    expect(activeTwapSubscriptions.size).toBe(0);
    expect(
      jest
        .mocked(Engine.context.PerpsController.getChaseOrders)
        .mock.results.filter(
          (result) =>
            Boolean((result.value as Promise<ChaseOrder[]>)?.then) &&
            !settledChaseReadPromises.has(
              result.value as Promise<ChaseOrder[]>,
            ),
        ),
    ).toHaveLength(0);
    expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(0);
    expect(PerpsCacheInvalidator.getSubscriberCount('accountState')).toBe(0);
    expect(PerpsCacheInvalidator.getSubscriberCount('markets')).toBe(0);
  } finally {
    issuedTwapReadPromises.clear();
    activeTwapSubscriptions.clear();
    settledChaseReadPromises.clear();
    PerpsCacheInvalidator._clearAllSubscribers();
    connectionReadySpy.mockRestore();
    connectionSubscriptionSpy.mockRestore();
    resetPerpsChaseOrdersStoreForTests();
    resetChaseOrderVisibilityForTests();
  }
});

const renderFundedProMarket = () =>
  renderPerpsProMarketView({
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
    },
  });

const renderProMarketWithTriggeredOrdersFlag = (enabled: boolean) =>
  renderPerpsProMarketView({
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
    },
    overrides: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsProTriggeredOrdersEnabled: {
                enabled,
                minimumVersion: '0.0.0',
              },
              perpsMobileTwap: {
                enabled: false,
                minimumVersion: '0.0.0',
              },
              perpsMobileChase: {
                enabled: false,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    },
  });

const renderProMarketWithTwapFlag = (
  enabled: boolean,
  activeProvider: 'hyperliquid' | 'myx' = 'hyperliquid',
) => {
  jest
    .mocked(Engine.context.PerpsController.getOrderCapabilities)
    .mockResolvedValue(
      activeProvider === 'hyperliquid'
        ? {
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: ['twap'],
          }
        : {
            status: 'unavailable',
            providerId: 'myx',
            reason: 'strategy_market_unsupported',
          },
    );

  return renderPerpsProMarketView({
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
    },
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider,
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsMobileTwap: {
                enabled,
                minimumVersion: '0.0.0',
              },
              perpsProTriggeredOrdersEnabled: {
                enabled: false,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    },
  });
};

const renderProMarketWithScaleFlag = (enabled: boolean) => {
  jest
    .mocked(Engine.context.PerpsController.getOrderCapabilities)
    .mockResolvedValue({
      status: 'ready',
      providerId: 'hyperliquid',
      supportedStrategies: enabled ? ['scale'] : [],
    });

  return renderPerpsProMarketView({
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
    },
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'hyperliquid',
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsProTriggeredOrdersEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsMobileScale: {
                enabled,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    },
  });
};

const findSizeInput = () =>
  screen.findByTestId(ids.SIZE_INPUT, {}, { timeout: TIMEOUT_MS });

const findPriceInput = (testID: string) =>
  screen.findByTestId(
    testID,
    { includeHiddenElements: true },
    { timeout: TIMEOUT_MS },
  );

const openTwapOrderForm = async () => {
  const sizeInput = await findSizeInput();
  fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
  await screen.findByTestId(
    PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
    {},
    { timeout: TIMEOUT_MS },
  );
  fireEvent.press(
    screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
  );
  await screen.findByTestId(
    PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION,
    {},
    { timeout: TIMEOUT_MS },
  );
  fireEvent.press(
    screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
  );

  return {
    sizeInput,
    section: await screen.findByTestId(ids.TWAP_DURATION_SECTION),
    durationButton: screen.getByTestId(ids.TWAP_DURATION_BUTTON),
    durationValue: screen.getByTestId(ids.TWAP_DURATION_VALUE),
    randomize: screen.getByTestId(ids.TWAP_RANDOMIZE),
  };
};

const openScaleOrderForm = async () => {
  const sizeInput = await findSizeInput();
  fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
  const advancedTab = await screen.findByTestId(
    PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
    {},
    { timeout: TIMEOUT_MS },
  );
  fireEvent.press(advancedTab);
  const scaleOption = await screen.findByTestId(
    PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION,
    {},
    { timeout: TIMEOUT_MS },
  );
  fireEvent.press(scaleOption);

  return sizeInput;
};

const openTwapDurationSheet = async () => {
  fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_BUTTON));
  await screen.findByTestId(
    ids.TWAP_DURATION_SHEET,
    {},
    { timeout: TIMEOUT_MS },
  );

  return screen.getByTestId(ids.TWAP_DURATION_PICKER);
};

const createTwapPickerDate = (hours: number, minutes: number) => {
  if (Platform.OS === 'ios') {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    date.setMinutes(hours * 60 + minutes);
    return date;
  }
  const date = new Date(0);
  date.setUTCHours(hours, minutes);
  return date;
};

const selectTriggeredOrderType = async (
  optionTestID: (typeof triggeredOrderTypeIDs)[number],
) => {
  fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
  fireEvent.press(
    await screen.findByTestId(
      PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
      {},
      { timeout: TIMEOUT_MS },
    ),
  );
  fireEvent.press(
    await screen.findByTestId(optionTestID, {}, { timeout: TIMEOUT_MS }),
  );
};

const emitEthPrice = (
  stream: { emitPrices: (prices: Record<string, PriceUpdate>) => void },
  price = '2501',
) => {
  act(() => {
    stream.emitPrices({
      ETH: {
        symbol: 'ETH',
        price,
        markPrice: price,
        percentChange24h: '2',
        timestamp: Date.now(),
        isTradable: true,
      },
    });
  });
};

const syncEngineControllerState = (
  store: ReturnType<typeof renderPerpsProMarketView>['store'],
  key:
    | 'AccountsController'
    | 'AccountTreeController'
    | 'PerpsController'
    | 'RemoteFeatureFlagController',
  nextState: Record<string, unknown>,
) => {
  const engineWithState = Engine as unknown as {
    state?: Record<string, unknown>;
  };
  engineWithState.state = {
    ...(engineWithState.state ?? {}),
    [key]: nextState,
  };
  store.dispatch(updateBgState({ key }));
};

describeForPlatforms('PerpsProMarketView input journeys', () => {
  itForPlatforms(
    'keeps the tabbed Chase flow available when the TWAP flag is absent',
    async () => {
      const getOrderCapabilities = jest.mocked(
        Engine.context.PerpsController.getOrderCapabilities,
      );
      getOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['chase'],
      });
      getOrderCapabilities.mockClear();
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('1000'),
        },
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsMobileChase: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsProTriggeredOrdersEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });
      await findSizeInput();
      await waitFor(() =>
        expect(getOrderCapabilities).toHaveBeenCalledWith({
          symbol: 'ETH',
          providerId: 'hyperliquid',
        }),
      );
      await act(async () => {
        await getOrderCapabilities.mock.results.at(-1)?.value;
      });

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      expect(
        await screen.findByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TABS),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
      ).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
      );
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).not.toBeOnTheScreen();
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.CHASE_OPTION,
        ),
      );

      expect(await screen.findByTestId(ids.CHASE_FORM)).toBeOnTheScreen();
      expect(screen.getByTestId(ids.REDUCE_ONLY)).toBeOnTheScreen();
      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(ids.TRIGGER_PRICE_INPUT),
      ).not.toBeOnTheScreen();
      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'discovers an active TWAP termination surface on cold-start rollback',
    async () => {
      mockTwapOrders([activeTwap]);
      renderProMarketWithTwapFlag(false);

      await openTwapManagementTab();

      expect(
        await screen.findByTestId(
          getPerpsProTwapTerminateSelector(
            activeTwap.providerId,
            activeTwap.orderId,
          ),
        ),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'renders complete TWAP data and switches a same-symbol provider row',
    async () => {
      // Arrange
      mockTwapOrders([completeTwap]);
      renderProMarketWithTwapFlag(true);

      // Act
      await openTwapManagementTab();
      const cardValueTestID = (baseTestID: string) =>
        getPerpsProTwapValueSelector(
          baseTestID,
          completeTwap.providerId,
          completeTwap.orderId,
        );

      // Assert: every significant card value crossed the real selector, hook,
      // panel, and formatting path from the async Engine result.
      expect(
        await screen.findByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_MARKET),
        ),
      ).toHaveTextContent('ETH');
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_DIRECTION_TAG),
        ),
      ).toHaveTextContent(strings('perps.market.close_short'));
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_REDUCE_ONLY_TAG),
        ),
      ).toHaveTextContent(
        strings('perps.pro_positions_panel.twap_card.reduce_only'),
      );
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_CREATED_AT),
        ),
      ).toHaveTextContent(formatProOrderCardTimestamp(completeTwap.startedAt));
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_STATUS_TAG),
        ),
      ).toHaveTextContent(
        strings('perps.pro_positions_panel.twap_card.status_active'),
      );
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_SIZE),
        ),
      ).toHaveTextContent('10 ETH');
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILLED_SIZE),
        ),
      ).toHaveTextContent('4 ETH');
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_AVERAGE_PRICE),
        ),
      ).toHaveTextContent('$2,500');
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_PROGRESS),
        ),
      ).toHaveTextContent('40%');
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_ELAPSED),
        ),
      ).toHaveTextContent('1 minute / 30 minutes');
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_RANDOMIZE),
        ),
      ).toHaveTextContent(strings('perps.order_details.yes'));
      expect(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_MARKET_BUTTON),
        ),
      ).toHaveProp(
        'accessibilityLabel',
        expect.stringContaining(strings('perps.market.close_short')),
      );

      // Act / Assert: the route starts on Hyperliquid ETH. A MYX ETH TWAP must
      // still switch venue, carrying its provider into the remounted form.
      fireEvent.press(
        screen.getByTestId(
          cardValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_MARKET_BUTTON),
        ),
      );
      await waitFor(() =>
        expect(
          Engine.context.PerpsController.getOrderCapabilities,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH', providerId: 'myx' }),
        ),
      );

      // Act / Assert: TWAP owns a complete side-filter selector family through
      // the real panel and shared sheet.
      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_SIDE_FILTER_BUTTON,
        ),
      );
      expect(
        await screen.findByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_SIDE_FILTER_SHEET,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_SIDE_FILTER_SHEET_CLOSE,
        ),
      ).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(getPerpsProTwapSideFilterOptionSelector('all')),
      );

      // Act
      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_VIEW_TAB_FILL_HISTORY,
        ),
      );
      const fillValueTestID = (baseTestID: string) =>
        getPerpsProTwapFillValueSelector(
          baseTestID,
          completeTwap.providerId,
          completeTwap.orderId,
          completeTwapFill.fillId,
        );

      // Assert: actual value elements, not row wrappers, expose all fill data.
      expect(
        screen.getByTestId(
          fillValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_MARKET),
        ),
      ).toHaveTextContent('ETH');
      expect(
        screen.getByTestId(
          fillValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_DIRECTION),
        ),
      ).toHaveTextContent(strings('perps.market.close_short'));
      expect(
        screen.getByTestId(
          fillValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_PRICE),
        ),
      ).toHaveTextContent('$2,500');
      expect(
        screen.getByTestId(
          fillValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_TIME),
        ),
      ).toHaveTextContent(
        formatProOrderCardTimestamp(completeTwapFill.timestamp),
      );
      expect(
        screen.getByTestId(
          fillValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_SIZE),
        ),
      ).toHaveTextContent('1.5 ETH');
    },
  );

  itForPlatforms(
    'retains an active TWAP termination surface when rollout turns off',
    async () => {
      mockTwapOrders([activeTwap]);
      const { store } = renderProMarketWithTwapFlag(true);
      await openTwapManagementTab();
      const terminateTestID = getPerpsProTwapTerminateSelector(
        activeTwap.providerId,
        activeTwap.orderId,
      );
      expect(await screen.findByTestId(terminateTestID)).toBeOnTheScreen();
      const remoteFeatureFlagController = store.getState().engine
        .backgroundState.RemoteFeatureFlagController as unknown as {
        remoteFeatureFlags: Record<string, unknown>;
      };

      act(() => {
        syncEngineControllerState(store, 'RemoteFeatureFlagController', {
          ...remoteFeatureFlagController,
          remoteFeatureFlags: {
            ...remoteFeatureFlagController.remoteFeatureFlags,
            perpsMobileTwap: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
          },
        });
      });

      expect(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_TWAP,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(terminateTestID)).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'keeps discovery retry available after rollback and recovers an active TWAP',
    async () => {
      const getTwapOrders = jest.mocked(
        Engine.context.PerpsController.getTwapOrders,
      );
      mockTwapOrdersFailure(new Error('venue down'));
      renderProMarketWithTwapFlag(false);

      await openTwapManagementTab();
      expect(
        await screen.findByTestId(PerpsProMarketViewSelectorsIDs.TWAP_ERROR),
      ).toBeOnTheScreen();
      const retryButton = screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.TWAP_RETRY,
      );
      await waitFor(() => expect(retryButton).toBeEnabled());

      mockTwapOrders([activeTwap]);
      fireEvent.press(retryButton);

      expect(
        await screen.findByTestId(
          getPerpsProTwapTerminateSelector(
            activeTwap.providerId,
            activeTwap.orderId,
          ),
        ),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'keeps an accepted TWAP termination disabled after refresh failure until stream confirmation',
    async () => {
      // Arrange
      const getTwapOrders = jest.mocked(
        Engine.context.PerpsController.getTwapOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      let emitTwapOrders:
        | ((orders: TwapOrder[], isSnapshot?: boolean) => void)
        | undefined;
      mockTwapOrders([activeTwap]);
      mockTwapOrderSubscription((callback) => {
        emitTwapOrders = callback;
      });
      cancelOrder.mockClear();
      cancelOrder.mockResolvedValueOnce({ success: true });
      renderProMarketWithTwapFlag(false);
      await openTwapManagementTab();
      const terminateTestID = getPerpsProTwapTerminateSelector(
        activeTwap.providerId,
        activeTwap.orderId,
      );
      const terminateButton = await screen.findByTestId(terminateTestID);
      fireEvent.press(terminateButton);
      expect(
        await screen.findByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_SHEET,
        ),
      ).toBeOnTheScreen();
      // Opening the sheet pauses live REST work. Configure the next explicit
      // post-cancel reconciliation only after that user-visible settled state.
      mockNextTwapOrdersFailure(new Error('refresh failed'));
      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_CONFIRM,
        ),
      );

      // Act: the venue accepts cancellation, but reconciliation fails.
      await waitFor(() => expect(cancelOrder).toHaveBeenCalledTimes(1));
      expect(
        await screen.findByTestId(PerpsProMarketViewSelectorsIDs.TWAP_ERROR),
      ).toBeOnTheScreen();

      // Assert: the stale active row cannot submit a second cancellation.
      expect(screen.getByTestId(terminateTestID)).toBeDisabled();
      fireEvent.press(screen.getByTestId(terminateTestID));
      expect(cancelOrder).toHaveBeenCalledTimes(1);

      // Act: the authoritative stream confirms terminal state.
      act(() => {
        emitTwapOrders?.([{ ...activeTwap, status: 'canceled' }], false);
      });

      // Assert
      await waitFor(() =>
        expect(screen.queryByTestId(terminateTestID)).not.toBeOnTheScreen(),
      );
    },
  );

  itForPlatforms(
    'pauses live REST reconciliation while termination confirmation is open and resumes on close',
    async () => {
      // Arrange
      const getTwapOrders = jest.mocked(
        Engine.context.PerpsController.getTwapOrders,
      );
      mockTwapOrders([activeTwap]);
      renderProMarketWithTwapFlag(false);
      await openTwapManagementTab();
      const terminateButton = await screen.findByTestId(
        getPerpsProTwapTerminateSelector(
          activeTwap.providerId,
          activeTwap.orderId,
        ),
      );
      const settledReadCount = getTwapOrders.mock.calls.length;

      // Act
      fireEvent.press(terminateButton);

      // Assert: opening confirmation does not trigger another REST read. The
      // interval-level pause is covered in the hook's timer contract test.
      expect(
        await screen.findByTestId(
          PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_SHEET,
        ),
      ).toBeOnTheScreen();
      expect(getTwapOrders).toHaveBeenCalledTimes(settledReadCount);

      // Act
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_CLOSE),
      );

      // Assert: close settles visibly before the resumed reconciliation lands.
      await waitFor(() =>
        expect(
          screen.queryByTestId(
            PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_SHEET,
          ),
        ).not.toBeOnTheScreen(),
      );
      await waitFor(() =>
        expect(getTwapOrders.mock.calls.length).toBeGreaterThan(
          settledReadCount,
        ),
      );
    },
  );

  for (const identityChange of ['account', 'provider', 'network'] as const) {
    itForPlatforms(
      `closes TWAP termination when the ${identityChange} identity changes`,
      async () => {
        mockTwapOrders([activeTwap]);
        const { store } = renderProMarketWithTwapFlag(false);
        await openTwapManagementTab();
        fireEvent.press(
          await screen.findByTestId(
            getPerpsProTwapTerminateSelector(
              activeTwap.providerId,
              activeTwap.orderId,
            ),
          ),
        );
        expect(
          await screen.findByTestId(
            PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_SHEET,
          ),
        ).toBeOnTheScreen();

        act(() => {
          if (identityChange === 'account') {
            const accountsController = store.getState().engine.backgroundState
              .AccountsController as unknown as {
              internalAccounts: {
                accounts: Record<string, Record<string, unknown>>;
                selectedAccount: string;
              };
            };
            const selectedAccountId =
              accountsController.internalAccounts.selectedAccount;
            const selectedAccount =
              accountsController.internalAccounts.accounts[selectedAccountId];
            const nextAccountId = 'acc-2';
            syncEngineControllerState(store, 'AccountsController', {
              ...accountsController,
              internalAccounts: {
                ...accountsController.internalAccounts,
                selectedAccount: nextAccountId,
                accounts: {
                  ...accountsController.internalAccounts.accounts,
                  [nextAccountId]: {
                    ...selectedAccount,
                    id: nextAccountId,
                    address: '0x0000000000000000000000000000000000000002',
                  },
                },
              },
            });
            const accountTreeController = store.getState().engine
              .backgroundState.AccountTreeController as unknown as {
              accountTree: {
                wallets: Record<
                  string,
                  {
                    groups: Record<string, Record<string, unknown>>;
                  }
                >;
              };
              selectedAccountGroup: string;
            };
            const selectedGroupId = accountTreeController.selectedAccountGroup;
            const [selectedWalletId] = selectedGroupId.split('/');
            const selectedWallet =
              accountTreeController.accountTree.wallets[selectedWalletId];
            const selectedGroup = selectedWallet.groups[selectedGroupId];
            syncEngineControllerState(store, 'AccountTreeController', {
              ...accountTreeController,
              accountTree: {
                ...accountTreeController.accountTree,
                wallets: {
                  ...accountTreeController.accountTree.wallets,
                  [selectedWalletId]: {
                    ...selectedWallet,
                    groups: {
                      ...selectedWallet.groups,
                      [selectedGroupId]: {
                        ...selectedGroup,
                        accounts: [nextAccountId],
                      },
                    },
                  },
                },
              },
            });
            return;
          }

          const perpsController = store.getState().engine.backgroundState
            .PerpsController as unknown as Record<string, unknown>;
          syncEngineControllerState(store, 'PerpsController', {
            ...perpsController,
            ...(identityChange === 'provider'
              ? { activeProvider: 'myx' }
              : { isTestnet: true }),
          });
        });

        await waitFor(() =>
          expect(
            screen.queryByTestId(
              PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_SHEET,
            ),
          ).not.toBeOnTheScreen(),
        );
      },
    );
  }

  itForPlatforms(
    'retains canceled History when the controller omits the terminated session',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      jest
        .mocked(Engine.context.PerpsController.getOrders)
        .mockResolvedValueOnce([]);
      getChaseOrders.mockResolvedValueOnce([activeChase]).mockResolvedValue([]);
      cancelOrder.mockClear();
      renderFundedProMarket();

      await openChaseManagementTab();
      const rowSelector = getPerpsProChaseRowSelector(
        'ETH',
        activeChase.handle,
        true,
      );
      expect(await screen.findByTestId(rowSelector)).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(
          getPerpsProChaseTerminateSelector(
            'active',
            'ETH',
            activeChase.handle,
            true,
          ),
        ),
      );

      await waitFor(() => {
        expect(cancelOrder).toHaveBeenCalledWith({
          orderId: activeChase.handle,
          symbol: 'ETH',
          orderType: 'chase',
        });
        expect(screen.queryByTestId(rowSelector)).not.toBeOnTheScreen();
      });
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );
      const canceledStatusSelector = getPerpsProChaseStatusSelector(
        'canceled',
        'ETH',
        activeChase.handle,
        true,
      );
      expect(
        await screen.findByTestId(canceledStatusSelector),
      ).toHaveTextContent(strings('perps.order.chase.status.canceled'));

      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_FILLED_ONLY),
      );
      await waitFor(() =>
        expect(
          screen.queryByTestId(canceledStatusSelector),
        ).not.toBeOnTheScreen(),
      );
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_FILLED_ONLY),
      );
      expect(
        await screen.findByTestId(canceledStatusSelector),
      ).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_POSITIONS,
        ),
      );
      await openChaseManagementTab();

      expect(
        await screen.findByTestId(canceledStatusSelector),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'shows canceled History when the controller returns canceled after termination',
    async () => {
      const canceledChase: ChaseOrder = {
        ...activeChase,
        status: 'canceled',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      getChaseOrders
        .mockResolvedValueOnce([activeChase])
        .mockResolvedValueOnce([canceledChase]);
      cancelOrder.mockClear();
      renderFundedProMarket();

      await openChaseManagementTab();
      fireEvent.press(
        screen.getByTestId(
          getPerpsProChaseTerminateSelector(
            'active',
            'ETH',
            activeChase.handle,
            true,
          ),
        ),
      );
      await waitFor(() => expect(cancelOrder).toHaveBeenCalledTimes(1));
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );

      expect(
        await screen.findByTestId(
          getPerpsProChaseStatusSelector(
            'canceled',
            'ETH',
            canceledChase.handle,
            true,
          ),
        ),
      ).toHaveTextContent(strings('perps.order.chase.status.canceled'));
    },
  );

  itForPlatforms(
    'tracks Chase termination only after acceptance with the asset payload',
    async () => {
      let resolveCancellation:
        | ((result: { success: boolean }) => void)
        | undefined;
      const partiallyFilledChase = {
        ...activeChase,
        remainingSize: '0.25',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      getChaseOrders
        .mockResolvedValueOnce([partiallyFilledChase])
        .mockResolvedValue([]);
      cancelOrder.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCancellation = resolve;
          }),
      );
      try {
        renderFundedProMarket();
        await openChaseManagementTab();
        cancelOrder.mockClear();
        trackEventSpy.mockClear();

        fireEvent.press(
          screen.getByTestId(
            getPerpsProChaseTerminateSelector(
              'active',
              'ETH',
              activeChase.handle,
              true,
            ),
          ),
        );

        expect(trackEventSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Perp UI Interaction',
            properties: expect.objectContaining({
              interaction_type: 'chase_terminated',
            }),
          }),
        );
        await act(async () => resolveCancellation?.({ success: true }));
        await waitFor(() =>
          expect(trackEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'Perp UI Interaction',
              properties: expect.objectContaining({
                interaction_type: 'chase_terminated',
                asset: 'ETH',
                fill_pct_at_terminate: 75,
              }),
            }),
          ),
        );
      } finally {
        trackEventSpy.mockRestore();
      }
    },
  );

  itForPlatforms(
    'omits Chase termination analytics when cancellation is rejected',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      getChaseOrders.mockResolvedValue([activeChase]);
      cancelOrder.mockResolvedValueOnce({ success: false, error: 'rejected' });
      try {
        renderFundedProMarket();
        await openChaseManagementTab();
        cancelOrder.mockClear();
        trackEventSpy.mockClear();

        fireEvent.press(
          screen.getByTestId(
            getPerpsProChaseTerminateSelector(
              'active',
              'ETH',
              activeChase.handle,
              true,
            ),
          ),
        );
        await waitFor(() => expect(cancelOrder).toHaveBeenCalledTimes(1));

        expect(trackEventSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Perp UI Interaction',
            properties: expect.objectContaining({
              interaction_type: 'chase_terminated',
            }),
          }),
        );
      } finally {
        trackEventSpy.mockRestore();
      }
    },
  );

  itForPlatforms(
    'retries termination while Chase termination is pending',
    async () => {
      const pendingChase: ChaseOrder = {
        ...activeChase,
        status: 'termination_pending',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      getChaseOrders.mockResolvedValue([pendingChase]);
      cancelOrder.mockClear();
      renderFundedProMarket();

      await openChaseManagementTab();
      expect(
        await screen.findByTestId(
          getPerpsProChaseStatusSelector(
            'termination_pending',
            'ETH',
            pendingChase.handle,
            true,
          ),
        ),
      ).toHaveTextContent(
        strings('perps.order.chase.status.termination_pending'),
      );
      fireEvent.press(
        screen.getByTestId(
          getPerpsProChaseTerminateSelector(
            'termination_pending',
            'ETH',
            pendingChase.handle,
            true,
          ),
        ),
      );

      await waitFor(() =>
        expect(cancelOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            orderId: pendingChase.handle,
            orderType: 'chase',
          }),
        ),
      );
    },
  );

  itForPlatforms(
    'registers only handles visible on the active Pro Chase tab',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([activeChase]);
      renderFundedProMarket();

      expect(isChaseOrderHandleVisible(activeChase.handle)).toBe(false);
      await openChaseManagementTab();

      await waitFor(() =>
        expect(isChaseOrderHandleVisible(activeChase.handle)).toBe(true),
      );
      expect(isChaseOrderHandleVisible('other-chase')).toBe(false);

      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );
      await waitFor(() =>
        expect(isChaseOrderHandleVisible(activeChase.handle)).toBe(false),
      );

      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
        ),
      );
      expect(isChaseOrderHandleVisible(activeChase.handle)).toBe(false);
    },
  );

  itForPlatforms(
    'shows every loaded field for an active Chase row',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([activeChase]);
      renderFundedProMarket();

      await openChaseManagementTab();
      const row = await screen.findByTestId(
        getPerpsProChaseRowSelector('ETH', activeChase.handle, true),
      );

      const rowContent = within(row);
      expect(rowContent.getByText('ETH')).toBeOnTheScreen();
      expect(
        rowContent.getByText(strings('perps.market.long')),
      ).toBeOnTheScreen();
      expect(
        rowContent.getByText(strings('perps.order.chase.card.size')),
      ).toBeOnTheScreen();
      expect(rowContent.getByText('1 ETH')).toBeOnTheScreen();
      expect(
        rowContent.getByText(strings('perps.order.chase.card.filled_size')),
      ).toBeOnTheScreen();
      expect(rowContent.getByText('0 ETH')).toBeOnTheScreen();
      expect(
        rowContent.getByText(strings('perps.order.limit_price')),
      ).toBeOnTheScreen();
      expect(rowContent.getByText(/\$2,500\.1/u)).toBeOnTheScreen();
      expect(
        rowContent.queryByText(strings('perps.order.reduce_only')),
      ).not.toBeOnTheScreen();
      expect(
        rowContent.getByText(strings('perps.order.chase.card.distance_chased')),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          getPerpsProChaseDistanceSelector('ETH', activeChase.handle, true),
        ),
      ).toHaveTextContent('0.01% / 0.05% max');
      expect(rowContent.getByText('Running · 20%')).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          getPerpsProChaseStatusSelector(
            'active',
            'ETH',
            activeChase.handle,
            true,
          ),
        ),
      ).toHaveProp('accessibilityLabel', 'Running · 20%');
      expect(
        screen.getByTestId(
          getPerpsProChaseTerminateSelector(
            'active',
            'ETH',
            activeChase.handle,
            true,
          ),
        ),
      ).toBeEnabled();
    },
  );

  itForPlatforms(
    'exposes the repriced limit value on the Chase key-value item',
    async () => {
      const repricedChase: ChaseOrder = {
        ...activeChase,
        handle: 'chase-view-repriced',
        repricings: 1,
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([repricedChase]);
      renderFundedProMarket();

      await openChaseManagementTab();

      expect(
        await screen.findByTestId(
          getPerpsProChaseRepriceSelector('ETH', repricedChase.handle, true),
        ),
      ).toHaveTextContent(/\$2,500\.1/u);
    },
  );

  itForPlatforms(
    'shows actual chased distance for an active Chase without a max distance',
    async () => {
      const unlimitedChase: ChaseOrder = {
        ...activeChase,
        handle: 'chase-view-unlimited',
        distanceChasedBps: 25,
        maxDistanceBps: undefined,
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([unlimitedChase]);
      renderFundedProMarket();

      await openChaseManagementTab();
      const row = await screen.findByTestId(
        getPerpsProChaseRowSelector('ETH', unlimitedChase.handle, true),
      );

      const rowContent = within(row);
      expect(
        rowContent.getByText(strings('perps.order.chase.card.distance_chased')),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          getPerpsProChaseDistanceSelector('ETH', unlimitedChase.handle, true),
        ),
      ).toHaveTextContent('0.25%');
      expect(
        rowContent.getByText(strings('perps.order.chase.running')),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'hides Chase selection when rollout is off and no session is retained',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([]);
      jest
        .mocked(Engine.context.PerpsController.getOrderCapabilities)
        .mockResolvedValue({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: ['scale'],
        });
      renderPerpsProMarketView({
        streamOverrides: { account: createFundedAccountForViews('1000') },
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsMobileScale: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsMobileChase: {
                    enabled: false,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        ),
      );

      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.CHASE_OPTION,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'keeps retained Chase lifecycle visible after rollout turns off',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([activeChase]);
      renderPerpsProMarketView({
        streamOverrides: { account: createFundedAccountForViews('1000') },
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsMobileChase: {
                    enabled: false,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });

      await openChaseManagementTab();

      expect(
        await screen.findByTestId(
          getPerpsProChaseRowSelector('ETH', activeChase.handle, true),
        ),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'shows canceled Chase without a terminate action',
    async () => {
      const canceledChase: ChaseOrder = {
        ...activeChase,
        status: 'canceled',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([canceledChase]);
      renderFundedProMarket();

      await openChaseManagementTab();
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );

      expect(
        await screen.findByTestId(
          getPerpsProChaseStatusSelector(
            'canceled',
            'ETH',
            canceledChase.handle,
            true,
          ),
        ),
      ).toHaveTextContent(strings('perps.order.chase.status.canceled'));
      expect(
        screen.queryByTestId(
          getPerpsProChaseTerminateSelector(
            'canceled',
            'ETH',
            canceledChase.handle,
            true,
          ),
        ),
      ).not.toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'shows backgrounded Chase in History without a terminate action',
    async () => {
      const backgroundedChase: ChaseOrder = {
        ...activeChase,
        status: 'backgrounded',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([backgroundedChase]);
      renderFundedProMarket();

      await openChaseManagementTab();
      expect(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_EMPTY_STATE),
      ).toHaveTextContent(strings('perps.order.chase.empty'));
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );

      expect(
        await screen.findByTestId(
          getPerpsProChaseStatusSelector(
            'backgrounded',
            'ETH',
            backgroundedChase.handle,
            true,
          ),
        ),
      ).toHaveTextContent(strings('perps.order.chase.status.backgrounded'));
      const row = screen.getByTestId(
        getPerpsProChaseRowSelector('ETH', backgroundedChase.handle, true),
      );
      expect(
        within(row).getByText(strings('perps.order.chase.card.max_distance')),
      ).toBeOnTheScreen();
      expect(within(row).getByText('0.05%')).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getPerpsProChaseTerminateSelector(
            'backgrounded',
            'ETH',
            backgroundedChase.handle,
            true,
          ),
        ),
      ).not.toBeOnTheScreen();
    },
  );

  for (const status of [
    'duration_reached',
    'max_distance_reached',
    'repricing_limit_reached',
  ] as const) {
    itForPlatforms(
      `demotes ${status} Chase to History without a terminate action`,
      async () => {
        const terminalChase: ChaseOrder = {
          ...activeChase,
          status,
        };
        const getChaseOrders = jest.mocked(
          Engine.context.PerpsController.getChaseOrders,
        );
        getChaseOrders.mockResolvedValue([terminalChase]);
        renderFundedProMarket();

        await openChaseManagementTab();
        fireEvent.press(
          screen.getByTestId(
            PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER,
          ),
        );

        expect(
          await screen.findByTestId(
            getPerpsProChaseStatusSelector(
              status,
              'ETH',
              terminalChase.handle,
              true,
            ),
          ),
        ).toHaveTextContent(strings(`perps.order.chase.status.${status}`));
        expect(
          screen.queryByTestId(
            getPerpsProChaseTerminateSelector(
              status,
              'ETH',
              terminalChase.handle,
              true,
            ),
          ),
        ).not.toBeOnTheScreen();
      },
    );
  }

  itForPlatforms(
    'switches Chase between empty Active and filtered History states',
    async () => {
      const canceledChase: ChaseOrder = {
        ...activeChase,
        handle: 'chase-history-canceled',
        status: 'canceled',
      };
      const filledChase: ChaseOrder = {
        ...activeChase,
        handle: 'chase-history-filled',
        status: 'filled',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([canceledChase, filledChase]);
      renderFundedProMarket();

      await openChaseManagementTab();
      expect(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_ACTIVE_FILTER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_EMPTY_STATE),
      ).toHaveTextContent(strings('perps.order.chase.empty'));

      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );
      expect(
        await screen.findByText(strings('perps.order.chase.status.canceled')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.order.chase.status.filled')),
      ).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_FILLED_ONLY),
      );
      await waitFor(() => {
        expect(
          screen.queryByText(strings('perps.order.chase.status.canceled')),
        ).not.toBeOnTheScreen();
      });
      expect(
        screen.getByText(strings('perps.order.chase.status.filled')),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'renders an immediately filled Chase in History after placement and tab remount',
    async () => {
      const filledChase: ChaseOrder = {
        handle: 'chase-75dc4054-7c01-4bff-b31f-2a046c35ffdb',
        symbol: 'ETH',
        side: 'buy',
        originalSize: '0.3',
        remainingSize: '0',
        arrivalPrice: '2500',
        restingPrice: '2500',
        restingOrderId: null,
        distanceChasedBps: 0,
        maxDistanceBps: 122.05839273508447,
        repricings: 0,
        startedAt: 1_788_274_359_115,
        status: 'filled',
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
      jest
        .mocked(Engine.context.PerpsController.getOrderCapabilities)
        .mockResolvedValue({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: ['chase'],
        });
      getChaseOrders
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([filledChase]);
      placeOrder.mockResolvedValueOnce({
        success: true,
        orderId: filledChase.handle,
        childOrderIds: ['59067112481'],
        submittedSize: '0.3',
      });
      renderPerpsProMarketView({
        streamOverrides: { account: createFundedAccountForViews('1000') },
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsMobileChase: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });
      const sizeInput = await findSizeInput();
      await waitFor(() =>
        expect(
          Engine.context.PerpsController.getOrderCapabilities,
        ).toHaveBeenCalled(),
      );
      await act(async () => Promise.resolve());
      fireEvent.changeText(sizeInput, '30');
      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        ),
      );
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.CHASE_OPTION,
        ),
      );
      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      await waitFor(() => expect(placeOrderButton).toBeEnabled(), {
        timeout: TIMEOUT_MS,
      });

      fireEvent.press(placeOrderButton);

      await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getChaseOrders).toHaveBeenCalledTimes(3));
      await openChaseManagementTab();
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );
      const rowSelector = getPerpsProChaseRowSelector(
        'ETH',
        filledChase.handle,
        true,
      );
      expect(await screen.findByTestId(rowSelector)).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_FILLED_ONLY),
      );
      expect(await screen.findByTestId(rowSelector)).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_POSITIONS,
        ),
      );
      await openChaseManagementTab();

      expect(await screen.findByTestId(rowSelector)).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.order.chase.status.filled')),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'moves an omitted Active Chase to Filled History from child fill evidence',
    async () => {
      const runtimeActiveChase: ChaseOrder = {
        ...activeChase,
        handle: 'chase-4dbd96d9-1b85-4067-8b04-da01423b8e7a',
        originalSize: '0.31',
        remainingSize: '0.31',
        restingOrderId: '59081412404',
        startedAt: 1_788_278_727_454,
      };
      const runtimeChildOrder: Order = {
        orderId: '59081412404',
        symbol: 'ETH',
        side: 'buy',
        orderType: 'limit',
        size: '0.31',
        originalSize: '0.31',
        price: '2500',
        filledSize: '0.31',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1_788_278_742_740,
        lastUpdated: 1_788_278_742_740,
      };
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const getOrders = jest.mocked(Engine.context.PerpsController.getOrders);
      getChaseOrders
        .mockResolvedValueOnce([runtimeActiveChase])
        .mockResolvedValue([]);
      getOrders.mockResolvedValue([runtimeChildOrder]);
      renderFundedProMarket();

      await openChaseManagementTab();
      const activeRowSelector = getPerpsProChaseRowSelector(
        'ETH',
        runtimeActiveChase.handle,
        true,
      );
      expect(await screen.findByTestId(activeRowSelector)).toBeOnTheScreen();
      act(() => PerpsCacheInvalidator.invalidate('accountState'));
      await waitFor(() => {
        expect(getChaseOrders).toHaveBeenCalledTimes(2);
        expect(screen.queryByTestId(activeRowSelector)).not.toBeOnTheScreen();
      });
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER),
      );
      const filledStatusSelector = getPerpsProChaseStatusSelector(
        'filled',
        'ETH',
        runtimeActiveChase.handle,
        true,
      );
      expect(await screen.findByTestId(filledStatusSelector)).toHaveTextContent(
        strings('perps.order.chase.status.filled'),
      );
      fireEvent.press(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_FILLED_ONLY),
      );
      expect(await screen.findByTestId(filledStatusSelector)).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_POSITIONS,
        ),
      );
      await openChaseManagementTab();

      expect(await screen.findByTestId(filledStatusSelector)).toBeOnTheScreen();
    },
  );

  itForPlatforms('shows loading while a Chase cancel is pending', async () => {
    let resolveCancel:
      | ((value: { success: boolean; orderId: string }) => void)
      | undefined;
    const getChaseOrders = jest.mocked(
      Engine.context.PerpsController.getChaseOrders,
    );
    const cancelOrder = jest.mocked(Engine.context.PerpsController.cancelOrder);
    getChaseOrders.mockResolvedValue([activeChase]);
    cancelOrder.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCancel = resolve;
        }),
    );
    renderFundedProMarket();

    await openChaseManagementTab();
    const cancelButton = await screen.findByTestId(
      getPerpsProChaseTerminateSelector(
        'active',
        'ETH',
        activeChase.handle,
        true,
      ),
    );
    fireEvent.press(cancelButton);

    await waitFor(() => expect(cancelButton).toBeDisabled());
    await act(async () => {
      resolveCancel?.({ success: true, orderId: activeChase.handle });
      await Promise.resolve();
    });
  });

  itForPlatforms(
    'does not show failure after accepted Chase cancellation when refresh fails',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      const loggerError = jest
        .spyOn(Logger, 'error')
        .mockImplementation(() => undefined);
      getChaseOrders
        .mockResolvedValueOnce([activeChase])
        .mockRejectedValueOnce(new Error('refresh unavailable'));
      cancelOrder.mockClear();

      try {
        renderFundedProMarket();
        await openChaseManagementTab();
        fireEvent.press(
          screen.getByTestId(
            getPerpsProChaseTerminateSelector(
              'active',
              'ETH',
              activeChase.handle,
              true,
            ),
          ),
        );

        await waitFor(() => {
          expect(cancelOrder).toHaveBeenCalledTimes(1);
          expect(loggerError).toHaveBeenCalled();
        });
        expect(
          screen.getByTestId(
            getPerpsProChaseStatusSelector(
              'active',
              'ETH',
              activeChase.handle,
              true,
            ),
          ),
        ).toBeOnTheScreen();
        expect(
          screen.queryByText(strings('perps.order.failed_to_cancel_order')),
        ).not.toBeOnTheScreen();
      } finally {
        loggerError.mockRestore();
      }
    },
  );

  itForPlatforms(
    'reports an unexpected controller refresh failure after Chase cancellation',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      const cancelOrder = jest.mocked(
        Engine.context.PerpsController.cancelOrder,
      );
      const loggerError = jest
        .spyOn(Logger, 'error')
        .mockImplementation(() => undefined);
      getChaseOrders
        .mockResolvedValueOnce([activeChase])
        .mockRejectedValueOnce(new Error('refresh failed'));
      cancelOrder.mockClear();

      try {
        renderFundedProMarket();
        await openChaseManagementTab();
        loggerError.mockClear();
        fireEvent.press(
          screen.getByTestId(
            getPerpsProChaseTerminateSelector(
              'active',
              'ETH',
              activeChase.handle,
              true,
            ),
          ),
        );

        await waitFor(() => {
          expect(cancelOrder).toHaveBeenCalledTimes(1);
          expect(loggerError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
              context: expect.objectContaining({
                name: 'PerpsProPositionsPanel.refreshAfterTerminateChase',
              }),
            }),
          );
        });
      } finally {
        loggerError.mockRestore();
      }
    },
  );

  itForPlatforms('keeps the Chase side filter local to the panel', async () => {
    const getChaseOrders = jest.mocked(
      Engine.context.PerpsController.getChaseOrders,
    );
    const shortChase = {
      ...activeChase,
      handle: 'chase-view-short',
      symbol: 'BTC',
      side: 'sell' as const,
    };
    getChaseOrders.mockResolvedValue([activeChase, shortChase]);
    renderFundedProMarket();

    await openChaseManagementTab();
    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.CHASE_SIDE_FILTER_BUTTON,
      ),
    );
    fireEvent.press(
      await screen.findByTestId(
        getPerpsProChaseSideFilterOptionSelector('short'),
      ),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(
          getPerpsProChaseRowSelector('ETH', activeChase.handle, true),
        ),
      ).not.toBeOnTheScreen();
    });
    expect(
      screen.getByTestId(
        getPerpsProChaseRowSelector('BTC', shortChase.handle, true),
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
      ),
    );

    expect(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_BUTTON,
      ),
    ).toHaveTextContent(
      strings('perps.pro_positions_panel.side_filter.all_sides'),
    );
  });

  itForPlatforms(
    'shows Chase side-filter copy when no rows match',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([activeChase]);
      renderFundedProMarket();
      await openChaseManagementTab();

      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.CHASE_SIDE_FILTER_BUTTON,
        ),
      );
      fireEvent.press(
        await screen.findByTestId(
          getPerpsProChaseSideFilterOptionSelector('short'),
        ),
      );

      expect(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_EMPTY_STATE),
      ).toHaveTextContent(strings('perps.order.chase.empty_short'));
    },
  );

  itForPlatforms(
    'shows Chase ticker-filter copy when no rows match',
    async () => {
      const getChaseOrders = jest.mocked(
        Engine.context.PerpsController.getChaseOrders,
      );
      getChaseOrders.mockResolvedValue([
        { ...activeChase, handle: 'chase-btc', symbol: 'BTC' },
      ]);
      renderFundedProMarket();

      await openChaseManagementTab();
      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY,
        ),
      );

      expect(
        screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHASE_EMPTY_STATE),
      ).toHaveTextContent(
        strings('perps.order.chase.empty_filtered', { ticker: 'ETH' }),
      );
      const chaseTab = screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_CHASE,
      );
      const chaseTabLabels = within(chaseTab).getAllByText(
        strings('perps.order.chase.tab'),
      );
      chaseTabLabels.forEach((label) => expect(label).toBeOnTheScreen());
    },
  );

  itForPlatforms(
    'supports size backspace and retype, then removes limit-price leading zeros',
    async () => {
      renderFundedProMarket();
      const sizeInput = await findSizeInput();

      fireEvent(sizeInput, 'focus');
      fireEvent.changeText(sizeInput, '1');
      await waitFor(() => expect(sizeInput).toHaveProp('value', '1'));
      fireEvent.changeText(sizeInput, '');
      await waitFor(() => expect(sizeInput).toHaveProp('value', ''));
      fireEvent.changeText(sizeInput, '2');

      await waitFor(() => expect(sizeInput).toHaveProp('value', '2'));
      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );
      const limitPriceInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(limitPriceInput, '00025');

      await waitFor(() => expect(limitPriceInput).toHaveProp('value', '25'));
    },
  );

  itForPlatforms(
    'shows triggered order types when the remote flag is enabled',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));

      expect(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB),
      ).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      );
      for (const testID of triggeredOrderTypeIDs) {
        expect(screen.getByTestId(testID)).toBeOnTheScreen();
      }
    },
  );

  itForPlatforms(
    'hides triggered order types when the remote flag is disabled',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(false);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        {},
        { timeout: TIMEOUT_MS },
      );

      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TABS),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      ).toBeOnTheScreen();
      for (const testID of triggeredOrderTypeIDs) {
        expect(screen.queryByTestId(testID)).not.toBeOnTheScreen();
      }
    },
  );

  itForPlatforms(
    'renders TWAP fields and hides incompatible inputs',
    async () => {
      renderProMarketWithTwapFlag(true);
      const { section, durationValue, randomize } = await openTwapOrderForm();

      expect(section).toBeOnTheScreen();
      expect(durationValue).toHaveTextContent('0h 30m');
      expect(
        screen.queryByTestId(ids.TWAP_DURATION_PICKER),
      ).not.toBeOnTheScreen();
      expect(randomize).not.toBeChecked();
      expect(screen.getByTestId(ids.REDUCE_ONLY)).toBeOnTheScreen();
      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(ids.TRIGGER_PRICE_INPUT),
      ).not.toBeOnTheScreen();
      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
    },
  );

  itForPlatforms('shows and clears TWAP minimum-size validation', async () => {
    renderProMarketWithTwapFlag(true);
    const { sizeInput } = await openTwapOrderForm();

    fireEvent.changeText(sizeInput, '99');

    await waitFor(() => {
      expect(
        screen.getByTestId(`${ids.NOTICE}-twap-min-size`),
      ).toHaveTextContent(
        strings(
          'perps.pro_order_form.twap.minimum_size',
          PERPS_TWAP_UI_CONFIG.MinimumSizeI18nValues,
        ),
      );
      expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
    });

    fireEvent.changeText(sizeInput, '100');

    await waitFor(() => {
      expect(
        screen.queryByTestId(`${ids.NOTICE}-twap-min-size`),
      ).not.toBeOnTheScreen();
    });
  });

  itForPlatforms('configures a randomized TWAP duration', async ({ os }) => {
    renderProMarketWithTwapFlag(true);
    const { sizeInput, randomize } = await openTwapOrderForm();
    const picker = await openTwapDurationSheet();
    const selectedDate = createTwapPickerDate(0, 30);

    fireEvent(
      picker,
      'onChange',
      {
        type: 'set',
        nativeEvent: { timestamp: selectedDate.getTime(), utcOffset: 0 },
      },
      selectedDate,
    );
    if (os === 'ios') {
      fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_SHEET_CLOSE));
    }
    fireEvent.changeText(sizeInput, '100');
    fireEvent.press(randomize);

    await waitFor(
      () => {
        expect(randomize).toBeChecked();
        expect(screen.getByTestId(ids.TWAP_DURATION_VALUE)).toHaveTextContent(
          '0h 30m',
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeEnabled();
      },
      { timeout: TIMEOUT_MS },
    );
  });

  itForPlatforms(
    'shows Basic and Advanced tabs when only TWAP is enabled',
    async () => {
      renderProMarketWithTwapFlag(true);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        {},
        { timeout: TIMEOUT_MS },
      );

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        ),
      ).not.toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
      );

      expect(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION,
        ),
      ).not.toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'keeps the shared Advanced sheet when TWAP is absent and supported Scale is enabled',
    async () => {
      renderProMarketWithScaleFlag(true);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      const advancedTab = await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        {},
        { timeout: TIMEOUT_MS },
      );
      fireEvent.press(advancedTab);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      ).toBeOnTheScreen();
      expect(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).not.toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'keeps the shared Basic and Triggered sheet when both advanced flags are off',
    async () => {
      renderProMarketWithScaleFlag(false);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.TABS,
        {},
        { timeout: TIMEOUT_MS },
      );

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).not.toBeOnTheScreen();
    },
  );

  itForPlatforms('hides TWAP when its remote flag is disabled', async () => {
    renderProMarketWithTwapFlag(false);
    await findSizeInput();

    fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
    await screen.findByTestId(
      PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
      {},
      { timeout: TIMEOUT_MS },
    );

    expect(
      screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
    ).not.toBeOnTheScreen();
  });

  itForPlatforms(
    'hides TWAP for a provider without TWAP placement support',
    async () => {
      renderProMarketWithTwapFlag(true, 'myx');
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        {},
        { timeout: TIMEOUT_MS },
      );

      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).not.toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'keeps the size stable while toggling between USD and the asset',
    async () => {
      renderFundedProMarket();
      const sizeInput = await findSizeInput();
      const unitButton = screen.getByTestId(ids.SIZE_UNIT_BUTTON);

      fireEvent.changeText(sizeInput, '100');
      await waitFor(() => expect(sizeInput).toHaveProp('value', '100'));
      fireEvent.press(unitButton);

      await waitFor(() => {
        expect(sizeInput).toHaveProp('value', '0.04');
        expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
          'Size (ETH)',
        );
      });
      fireEvent.press(unitButton);

      await waitFor(() => {
        expect(sizeInput).toHaveProp('value', '100');
        expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
          'Size (USD)',
        );
      });
    },
  );

  itForPlatforms(
    'forces USD sizing when Scale ladder prices differ from the market',
    async () => {
      renderProMarketWithScaleFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent.press(screen.getByTestId(ids.SIZE_UNIT_BUTTON));
      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
          'Size (ETH)',
        ),
      );

      await openScaleOrderForm();
      fireEvent.press(screen.getByTestId(`${ids.SCALE_START_PRICE}-field`));
      fireEvent.changeText(screen.getByTestId(ids.SCALE_START_PRICE), '2000');
      fireEvent.press(screen.getByTestId(`${ids.SCALE_END_PRICE}-field`));
      fireEvent.changeText(screen.getByTestId(ids.SCALE_END_PRICE), '2200');
      fireEvent.press(screen.getByTestId(`${ids.SCALE_TOTAL_ORDERS}-field`));
      fireEvent.changeText(screen.getByTestId(ids.SCALE_TOTAL_ORDERS), '3');

      await waitFor(() => {
        expect(sizeInput).toHaveProp('value', '100');
        expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
          'Size (USD)',
        );
        expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toBeDisabled();
      });
    },
  );

  itForPlatforms(
    'previews slider sizing live and keeps it after drag-end commit',
    async () => {
      renderFundedProMarket();
      const sizeInput = await findSizeInput();
      const slider = screen.getByTestId(ids.SIZE_SLIDER);
      const initialValue = sizeInput.props.value;

      fireEvent(slider, 'valueChange', 50);

      await waitFor(() => {
        expect(sizeInput.props.value).not.toBe(initialValue);
        expect(Number(sizeInput.props.value)).toBeGreaterThan(0);
      });
      const previewValue = sizeInput.props.value;
      fireEvent(slider, 'dragEnd', 50);

      await waitFor(() => expect(sizeInput).toHaveProp('value', previewValue));
    },
  );

  itForPlatforms(
    'keeps the CTA enabled without loading during live price validation',
    async () => {
      const validateOrder = jest.mocked(
        Engine.context.PerpsController.validateOrder,
      );
      const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
      let resolvePendingValidation:
        | ((result: { isValid: boolean }) => void)
        | undefined;
      const pendingValidation = new Promise<{ isValid: boolean }>((resolve) => {
        resolvePendingValidation = resolve;
      });
      validateOrder.mockClear();
      validateOrder.mockResolvedValue({ isValid: true });
      placeOrder.mockClear();

      const { stream } = renderFundedProMarket();
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent(sizeInput, 'blur');

      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      await waitFor(() => expect(placeOrderButton).toBeEnabled(), {
        timeout: TIMEOUT_MS,
      });

      validateOrder.mockReturnValue(pendingValidation);
      await new Promise<void>((resolve) => setTimeout(resolve, 1100));
      emitEthPrice(stream);

      await waitFor(() => {
        expect(placeOrderButton).toBeOnTheScreen();
        expect(placeOrderButton).toBeEnabled();
        expect(placeOrderButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: false }),
        );
        expect(placeOrderButton.props.accessibilityState).not.toEqual(
          expect.objectContaining({ busy: true }),
        );
      });
      expect(placeOrder).not.toHaveBeenCalled();

      await act(async () => {
        resolvePendingValidation?.({ isValid: true });
        await pendingValidation;
      });
      validateOrder.mockResolvedValue({ isValid: true });

      await waitFor(() => {
        expect(placeOrderButton).toBeEnabled();
      });
    },
  );

  itForPlatforms(
    'blocks reduce-only orders when there is no open position',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('1000'),
          positions: [],
          orders: [],
        },
      });
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      await waitFor(() => {
        expect(
          screen.getByTestId(`${ids.NOTICE}-reduce-only`),
        ).toHaveTextContent(
          strings('perps.order.validation.reduce_only_no_position'),
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', '');
      });

      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'valueChange', 50);
      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'dragEnd', 50);

      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', ''),
      );
    },
  );

  itForPlatforms(
    'blocks reduce-only orders that match the open position direction',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('1000'),
          positions: [createLongPositionForViews()],
          orders: [],
        },
      });
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      await waitFor(() => {
        expect(
          screen.getByTestId(`${ids.NOTICE}-reduce-only`),
        ).toHaveTextContent(
          strings('perps.order.validation.reduce_only_wrong_side'),
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', '');
      });

      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'valueChange', 50);
      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'dragEnd', 50);

      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', ''),
      );
    },
  );

  itForPlatforms(
    'blocks reduce-only orders when size exceeds the open position',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('100000'),
          positions: [createLongPositionForViews({ size: '-1' })],
          orders: [],
        },
      });
      const sizeInput = await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));
      fireEvent.changeText(sizeInput, '3000');

      await waitFor(() => {
        expect(
          screen.getByTestId(`${ids.NOTICE}-reduce-only`),
        ).toHaveTextContent(
          strings('perps.order.validation.reduce_only_too_large'),
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(sizeInput).toHaveProp('value', '3000');
      });
    },
  );

  itForPlatforms(
    'sets the size slider max to the open position when Reduce Only is selected',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [createLongPositionForViews({ size: '-1' })],
          orders: [],
        },
      });
      await findSizeInput();
      const slider = screen.getByTestId(ids.SIZE_SLIDER);

      fireEvent(slider, 'valueChange', 2500);
      fireEvent(slider, 'dragEnd', 2500);

      await waitFor(() => {
        const marginCappedAmount = Number(
          screen.getByTestId(ids.SIZE_INPUT).props.value,
        );
        expect(marginCappedAmount).toBeGreaterThan(0);
        expect(marginCappedAmount).toBeLessThan(2500);
      });

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      await waitFor(() => {
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
      });

      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'valueChange', 2500);
      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'dragEnd', 2500);

      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', '2500'),
      );
    },
  );

  itForPlatforms(
    'silently blocks an invalid stop-market price until blur shows guidance',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      await selectTriggeredOrderType(
        PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
      );

      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      fireEvent.changeText(triggerInput, '1000');

      await waitFor(
        () => {
          expect(
            screen.queryByTestId(ids.PRICE_CARD_MESSAGE),
          ).not.toBeOnTheScreen();
          expect(placeOrderButton).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );

      fireEvent(triggerInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.trigger_must_be_above_mid'),
          );
          expect(placeOrderButton).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'blocks a long take-market trigger above mid after blur',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      await selectTriggeredOrderType(
        PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
      );

      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      fireEvent.changeText(triggerInput, '3000');
      fireEvent(triggerInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.trigger_must_be_below_mid'),
          );
          expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'blocks a short stop-limit trigger above mid before showing blur guidance',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      await selectTriggeredOrderType(
        PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
      );

      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      fireEvent.changeText(triggerInput, '3000');

      expect(
        screen.queryByTestId(ids.PRICE_CARD_MESSAGE),
      ).not.toBeOnTheScreen();
      expect(placeOrderButton).toBeDisabled();

      fireEvent(triggerInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.trigger_must_be_below_mid'),
          );
          expect(placeOrderButton).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'blocks a short take-limit trigger below mid before showing blur guidance',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      await selectTriggeredOrderType(
        PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
      );

      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      fireEvent.changeText(triggerInput, '1000');

      expect(
        screen.queryByTestId(ids.PRICE_CARD_MESSAGE),
      ).not.toBeOnTheScreen();
      expect(placeOrderButton).toBeDisabled();

      fireEvent(triggerInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.trigger_must_be_above_mid'),
          );
          expect(placeOrderButton).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms('defers required trigger guidance until blur', async () => {
    renderProMarketWithTriggeredOrdersFlag(true);
    const sizeInput = await findSizeInput();
    fireEvent.changeText(sizeInput, '100');

    await selectTriggeredOrderType(
      PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
    );

    const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
    const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);

    await waitFor(
      () => {
        expect(
          screen.queryByTestId(ids.PRICE_CARD_MESSAGE),
        ).not.toBeOnTheScreen();
        expect(placeOrderButton).toBeDisabled();
      },
      { timeout: TIMEOUT_MS },
    );

    fireEvent(triggerInput, 'blur');

    await waitFor(
      () => {
        expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
          strings('perps.order.validation.please_set_a_trigger_price'),
        );
        expect(placeOrderButton).toBeDisabled();
      },
      { timeout: TIMEOUT_MS },
    );
  });

  itForPlatforms(
    'blocks an empty ordinary limit price before showing blur guidance',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      const limitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      expect(
        screen.queryByTestId(ids.PRICE_CARD_MESSAGE),
      ).not.toBeOnTheScreen();
      expect(placeOrderButton).toBeDisabled();

      fireEvent(limitInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.limit_price_required'),
          );
          expect(placeOrderButton).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms('defers required limit guidance until blur', async () => {
    renderProMarketWithTriggeredOrdersFlag(true);
    const sizeInput = await findSizeInput();
    fireEvent.changeText(sizeInput, '100');

    await selectTriggeredOrderType(
      PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
    );

    const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
    const limitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
    const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
    fireEvent.changeText(triggerInput, '2600');

    await waitFor(
      () => {
        expect(
          screen.queryByTestId(ids.PRICE_CARD_MESSAGE),
        ).not.toBeOnTheScreen();
        expect(placeOrderButton).toBeDisabled();
      },
      { timeout: TIMEOUT_MS },
    );

    fireEvent(limitInput, 'blur');

    await waitFor(
      () => {
        expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
          strings('perps.order.validation.limit_price_required'),
        );
        expect(placeOrderButton).toBeDisabled();
      },
      { timeout: TIMEOUT_MS },
    );
  });

  itForPlatforms(
    'submits a stop-limit order with triggerPrice and limit price',
    async () => {
      const validateOrder = jest.mocked(
        Engine.context.PerpsController.validateOrder,
      );
      const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
      validateOrder.mockClear();
      placeOrder.mockClear();
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      await selectTriggeredOrderType(
        PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
      );

      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      const limitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(triggerInput, '2600');
      fireEvent(triggerInput, 'blur');
      fireEvent.changeText(limitInput, '2650');
      fireEvent(limitInput, 'blur');

      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      let finalValidation: Promise<unknown> | undefined;
      await waitFor(
        () => {
          const validationCallIndex = validateOrder.mock.calls.findIndex(
            ([params]) =>
              params.orderType === 'stop_limit' &&
              params.triggerPrice === '2600' &&
              params.price === '2650',
          );
          expect(validationCallIndex).toBeGreaterThanOrEqual(0);
          finalValidation = validateOrder.mock.results[validationCallIndex]
            ?.value as Promise<unknown>;
        },
        { timeout: TIMEOUT_MS },
      );
      await act(async () => {
        await finalValidation;
      });
      await waitFor(
        () => {
          expect(placeOrderButton).not.toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
      fireEvent.press(placeOrderButton);

      await waitFor(
        () => {
          expect(placeOrder).toHaveBeenCalledWith(
            expect.objectContaining({
              symbol: 'ETH',
              orderType: 'stop_limit',
              triggerPrice: '2600',
              price: '2650',
            }),
          );
        },
        { timeout: TIMEOUT_MS },
      );
      expect(placeOrder.mock.calls[0][0]).not.toHaveProperty('takeProfitPrice');
    },
  );

  itForPlatforms(
    'shows the final validation error and skips trigger-limit execution',
    async () => {
      const validateOrder = jest.mocked(
        Engine.context.PerpsController.validateOrder,
      );
      const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
      validateOrder.mockClear();
      validateOrder.mockResolvedValue({ isValid: true });
      placeOrder.mockClear();

      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      await selectTriggeredOrderType(
        PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
      );

      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      const limitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(triggerInput, '2600');
      fireEvent(triggerInput, 'blur');
      fireEvent.changeText(limitInput, '2650');
      fireEvent(limitInput, 'blur');

      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      await waitFor(() => expect(placeOrderButton).toBeEnabled(), {
        timeout: TIMEOUT_MS,
      });

      await waitFor(
        () => {
          const validationCallIndex = validateOrder.mock.calls.findIndex(
            ([params]) =>
              params.orderType === 'stop_limit' &&
              params.triggerPrice === '2600' &&
              params.price === '2650',
          );
          expect(validationCallIndex).toBeGreaterThanOrEqual(0);
        },
        { timeout: TIMEOUT_MS },
      );
      const validationCallIndex = validateOrder.mock.calls.findIndex(
        ([params]) =>
          params.orderType === 'stop_limit' &&
          params.triggerPrice === '2600' &&
          params.price === '2650',
      );
      await act(async () => {
        await validateOrder.mock.results[validationCallIndex]?.value;
      });

      validateOrder.mockResolvedValueOnce({
        isValid: false,
        error: 'Final validation failed',
      });
      fireEvent.press(placeOrderButton);

      await waitFor(
        () => {
          expect(
            screen.getByTestId(`${ids.NOTICE}-validation-0`),
          ).toHaveTextContent('Final validation failed');
          expect(placeOrder).not.toHaveBeenCalled();
          expect(placeOrderButton).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );
});

describe('PerpsProMarketView header actions', () => {
  it('shows Pro header actions including wallet, watchlist, and mode toggle', async () => {
    renderPerpsProMarketView();

    expect(
      await screen.findByTestId(
        PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    );

    expect(
      await screen.findByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
