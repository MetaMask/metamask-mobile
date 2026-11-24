import '../../../../../../tests/component-view/mocks';

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  InitializationState,
  type ScaleOrderGroup,
  type PerpsRecoveredDispatch,
  type PerpsPendingManualRecovery,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import {
  renderPerpsHomeView,
  renderPerpsMarketDetailsView,
  renderPerpsProMarketView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { wirePerpsControllerForStore } from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import {
  clearPerpsOutreachApiMocks,
  setupPerpsOutreachApiMock,
} from '../../../../../../tests/component-view/api-mocking/perpsOutreach';
import {
  PerpsHomeViewSelectorsIDs as HOME,
  PerpsMarketDetailsViewSelectorsIDs as LITE,
  PerpsProMarketViewSelectorsIDs as PRO,
  PerpsScaleOrderGroupsSelectorsIDs as GROUP,
  PerpsRecoveryPanelTestIds as RECOVERY,
} from '../../Perps.testIds';
import { clearPendingPerpsCufTraces } from '../../utils/perpsCufTrace';

const controller = Engine.context.PerpsController;
let unwirePerpsControllerForStore: (() => void) | undefined;
const address = '0x0000000000000000000000000000000000000001';
const market = createEthMarketForViews({ providerId: 'lighter' });
const dispatch: PerpsRecoveredDispatch = {
  recoveryId: 'opaque-owned-dispatch',
  providerId: 'lighter',
  walletAddress: address,
  network: 'testnet',
  kind: 14,
  intent: 'internal-owned-intent',
  txHash: null,
  outcome: 'succeeded',
  evidence: 'internal-venue-evidence',
};
const protection: PerpsPendingManualRecovery = {
  recoveryId: 'opaque-owned-protection',
  providerId: 'lighter',
  walletAddress: address,
  network: 'testnet',
  symbol: 'ETH',
  settlementKey: 'internal-owned-settlement',
  recordedAt: 1_790_000_000_000,
  reason: 'internal-owned-reason',
  priorIntent: 'replace',
  survivingOrderIds: ['exact-surviving-order'],
  actionNeeded: 'internal-owned-guidance',
};
const group: ScaleOrderGroup = {
  groupId: 'lighter-scale:owned-group',
  orderId: 'lighter-scale:owned-group',
  symbol: 'ETH',
  providerId: 'lighter',
  walletAddress: address,
  network: 'testnet',
  accountIndex: 28,
  apiKeyIndex: 2,
  state: 'terminal',
  acceptedSize: '0.025',
  filledSize: '0',
  acceptedChildren: [{ state: 'canceled', orderId: '844424931788013' }],
  childOrderIds: [],
};
const options = {
  initialParams: { market },
  streamOverrides: {
    account: createFundedAccountForViews('1000'),
    marketData: [market],
    positions: [],
    orders: [],
  },
  overrides: {
    engine: {
      backgroundState: {
        PerpsController: {
          activeProvider: 'lighter' as const,
          initializationState: InitializationState.Initialized,
          isTestnet: true,
          isEligible: true,
          isFirstTimeUser: { mainnet: false, testnet: false },
        },
      },
    },
  },
};

describe('Established Perps layout with retained recovery state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupPerpsOutreachApiMock();
    jest
      .mocked(controller.getRecoveredDispatches)
      .mockReset()
      .mockResolvedValue([dispatch]);
    jest
      .mocked(controller.getPendingManualRecoveries)
      .mockReset()
      .mockResolvedValue([protection]);
    jest
      .mocked(controller.getScaleOrderGroups)
      .mockReset()
      .mockResolvedValue([group]);
  });

  afterEach(() => {
    cleanup();
    unwirePerpsControllerForStore?.();
    unwirePerpsControllerForStore = undefined;
    clearPerpsOutreachApiMocks();
    clearPendingPerpsCufTraces();
  });

  it.each(['placing', 'stopped', 'unknown', 'terminal'] as const)(
    'keeps %s Scale receipts out of the Pro layout and Orders',
    async (state) => {
      jest
        .mocked(controller.getScaleOrderGroups)
        .mockResolvedValue([{ ...group, state }]);
      const mounted = renderPerpsProMarketView(options);
      unwirePerpsControllerForStore = wirePerpsControllerForStore(
        mounted.store,
      );

      await screen.findByTestId(PRO.ORDER_FORM_PANEL);
      fireEvent.press(screen.getByTestId(PRO.ORDER_BOOK_EXPAND_BUTTON));
      await screen.findByTestId(PRO.ORDER_BOOK_PANEL);
      fireEvent.press(screen.getByTestId(PRO.POSITIONS_PANEL_TAB_ORDERS));

      expect(screen.getByTestId(PRO.CHART_PANEL)).toBeOnTheScreen();
      expect(screen.getByTestId(PRO.LAYOUT)).toBeOnTheScreen();
      expect(screen.getByTestId(PRO.ORDER_BOOK_PANEL)).toBeOnTheScreen();
      expect(screen.queryByTestId(GROUP.PANEL)).not.toBeOnTheScreen();
      expect(screen.queryByTestId(RECOVERY.PANEL)).not.toBeOnTheScreen();
      expect(screen.queryByText('844424931788013')).not.toBeOnTheScreen();
      expect(controller.getScaleOrderGroups).not.toHaveBeenCalled();
      expect(controller.getRecoveredDispatches).not.toHaveBeenCalled();
      expect(controller.getPendingManualRecoveries).not.toHaveBeenCalled();
    },
  );

  it('keeps recovery controls out of Home when interrupted activity is retained', async () => {
    renderPerpsHomeView(options);

    await screen.findByTestId(HOME.SCROLL_CONTENT);

    await waitFor(() =>
      expect(screen.queryByTestId(RECOVERY.PANEL)).not.toBeOnTheScreen(),
    );
    expect(controller.getRecoveredDispatches).not.toHaveBeenCalled();
    expect(controller.getPendingManualRecoveries).not.toHaveBeenCalled();
  });

  it('keeps recovery controls out of Lite market details when interrupted activity is retained', async () => {
    renderPerpsMarketDetailsView(options);

    await screen.findByTestId(LITE.HEADER);

    await waitFor(() =>
      expect(screen.queryByTestId(RECOVERY.PANEL)).not.toBeOnTheScreen(),
    );
    expect(controller.getRecoveredDispatches).not.toHaveBeenCalled();
    expect(controller.getPendingManualRecoveries).not.toHaveBeenCalled();
  });
});
