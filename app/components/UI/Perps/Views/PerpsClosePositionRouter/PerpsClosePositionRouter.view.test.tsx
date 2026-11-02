/**
 * Component view tests for the close-position A/B router.
 * The assignment comes from the remote feature flag in Redux, not a mocked hook.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { KeypadTestIds } from '../../../../Base/Keypad/Keypad.testIds';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsClosePositionRouter } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import {
  PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
  ScreenVsBottomSheetVariant,
} from '../../abTestConfig';
import { resetLastCloseOrderType } from '../../hooks/usePerpsClosePositionForm';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import {
  PerpsAmountDisplaySelectorsIDs,
  PerpsClosePositionBottomSheetSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsFeeDiscountLabelSelectorsIDs,
} from '../../Perps.testIds';

const TIMEOUT_MS = 5000;

const GRANT_FEE_QUOTE = {
  feeRate: 0.0007,
  feeAmount: 1.75,
  protocolFeeRate: 0.00045,
  protocolFeeAmount: 1.125,
  metamaskFeeRate: 0.00025,
  metamaskFeeAmount: 0.625,
  chargesMetamaskBuilderFee: true,
  feeSource: 'grant',
  metamaskFeeDiscountBips: 7500,
  undiscountedMetamaskFeeRate: 0.001,
} as const;

const renderWithVariant = (
  variant?: ScreenVsBottomSheetVariant,
  options: {
    /** Position being closed; defaults to the standard long ETH fixture. */
    position?: Position;
    /** Live ETH price to emit into the stream. */
    price?: string;
    /** Enables the close-position limit-order flag for limit tests. */
    limitOrderFlag?: boolean;
  } = {},
) => {
  const {
    position = createLongPositionForViews(),
    price = '2500',
    limitOrderFlag = false,
  } = options;

  const remoteFeatureFlags: Record<string, unknown> = {};
  if (variant) {
    remoteFeatureFlags[PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY] = variant;
  }
  if (limitOrderFlag) {
    remoteFeatureFlags.perpsClosePositionLimitOrderEnabled = {
      enabled: true,
      minimumVersion: '0.0.0',
    };
  }

  const result = renderPerpsClosePositionRouter({
    initialParams: { position },
    overrides: Object.keys(remoteFeatureFlags).length
      ? ({
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags,
              },
            },
          },
        } as unknown as DeepPartial<RootState>)
      : undefined,
    streamOverrides: {
      account: createFundedAccountForViews('10000'),
      positions: [position],
      marketData: [createEthMarketForViews()],
    },
  });

  act(() => {
    result.stream.emitPrices({
      ETH: {
        symbol: 'ETH',
        price,
        timestamp: Date.now(),
        isTradable: true,
      },
    });
  });

  return result;
};

describe('PerpsClosePositionRouter', () => {
  const calculateFees = Engine.context.PerpsController
    .calculateFees as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    calculateFees.mockReset().mockResolvedValue({});
  });

  it('renders the full-page close flow when no assignment exists', async () => {
    renderWithVariant();

    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('renders the full-page close flow for control', async () => {
    renderWithVariant(ScreenVsBottomSheetVariant.Control);

    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('renders the bottom sheet for treatment', async () => {
    renderWithVariant(ScreenVsBottomSheetVariant.Treatment);

    expect(
      await screen.findByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        screen.queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeNull();
    });
  });

  it('presents a Core grant quote in the full-page close flow', async () => {
    calculateFees.mockResolvedValue(GRANT_FEE_QUOTE);

    renderWithVariant(ScreenVsBottomSheetVariant.Control);

    expect(
      await screen.findByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.tooltips.fees.promotional_discount')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('presents a Core grant quote in the close bottom sheet', async () => {
    calculateFees.mockResolvedValue(GRANT_FEE_QUOTE);

    renderWithVariant(ScreenVsBottomSheetVariant.Treatment);

    expect(
      await screen.findByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.FEE_DISCLAIMER,
      ),
    ).toHaveTextContent('Includes 0.145% 0.070% fee after promo');
    expect(
      screen.queryByText(strings('perps.tooltips.fees.promotional_discount')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
    expect(calculateFees).toHaveBeenCalled();
  });

  describe('bottom-sheet P&L row', () => {
    /**
     * Renders the treatment (bottom-sheet) variant with a specific position.
     * `price` drives the live ETH price; `limitOrderFlag` also enables the
     * close-position limit-order flag so the order-type toggle is reachable.
     */
    const renderTreatmentSheet = (
      position: Position,
      options: { price?: string; limitOrderFlag?: boolean } = {},
    ) =>
      renderWithVariant(ScreenVsBottomSheetVariant.Treatment, {
        position,
        ...options,
      });

    const findPnlRow = () =>
      screen.findByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL,
        {},
        { timeout: TIMEOUT_MS },
      );

    /** Switches the sheet to limit mode and applies the mid (live) preset. */
    const selectLimitAtMidPrice = async () => {
      fireEvent.press(
        await screen.findByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_BUTTON,
        ),
      );
      fireEvent.press(
        await screen.findByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_MID,
        ),
      );
      fireEvent.press(screen.getByText(strings('perps.deposit.done_button')));
    };

    beforeEach(() => {
      // The sheet remembers the last order type across mounts; a limit test
      // must not leak the limit default into the market-mode tests.
      resetLastCloseOrderType();
    });

    it('shows the position RoE in the P&L row for a market close', async () => {
      // Fixture: unrealizedPnl 100, returnOnEquity 0.10 (i.e. +10.00%),
      // deliberately different from PnL over margin (100 / 833.33 = +12.00%).
      renderTreatmentSheet(createLongPositionForViews());

      expect(await findPnlRow()).toHaveTextContent('+$100 (+10.00%)');
    });

    it('shows a loss and the position RoE in the P&L row for a market close', async () => {
      // The market-loss case, moved from the hook-mocked bottom-sheet unit
      // suite: unrealizedPnl -100 with returnOnEquity -0.10 (i.e. -10.00%).
      renderTreatmentSheet(
        createLongPositionForViews({
          unrealizedPnl: '-100',
          returnOnEquity: '-0.10',
        }),
      );

      expect(await findPnlRow()).toHaveTextContent('-$100 (-10.00%)');
    });

    it('keeps the position RoE on a partial market close', async () => {
      renderTreatmentSheet(createLongPositionForViews());

      fireEvent.press(
        await screen.findByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );
      fireEvent.press(screen.getByText('50%'));
      fireEvent.press(screen.getByText(strings('perps.deposit.done_button')));

      expect(await findPnlRow()).toHaveTextContent('+$50 (+10.00%)');
    });

    it('shows the RoE at the limit price for a limit close', async () => {
      // Entry 2500, 3x leverage, limit at the live price 2600: the RoE at that
      // price is (2600 - 2500) / 2500 × 3 = +12.00%, agreeing with the +$100
      // limit P&L instead of the mark-price position RoE.
      renderTreatmentSheet(createLongPositionForViews(), {
        price: '2600',
        limitOrderFlag: true,
      });

      await selectLimitAtMidPrice();

      expect(await findPnlRow()).toHaveTextContent('+$100 (+12.00%)');
    });

    it('shows the RoE at the limit price for a losing limit close', async () => {
      // Entry 2500, 3x leverage, limit at the live price 2400: the RoE at
      // that price is (2400 - 2500) / 2500 × 3 = -12.00%, agreeing with the
      // -$100 limit P&L instead of the mark-price position RoE.
      renderTreatmentSheet(createLongPositionForViews(), {
        price: '2400',
        limitOrderFlag: true,
      });

      await selectLimitAtMidPrice();

      expect(await findPnlRow()).toHaveTextContent('-$100 (-12.00%)');
    });

    it('shows the RoE at the limit price for a short limit close', async () => {
      // Short 1 ETH, entry 2500, 3x leverage, limit at the live price 2400:
      // the RoE at that price is -(2400 - 2500) / 2500 × 3 = +12.00%,
      // agreeing with the +$100 limit P&L — the direction branch the long
      // cases cannot guard.
      renderTreatmentSheet(createLongPositionForViews({ size: '-1' }), {
        price: '2400',
        limitOrderFlag: true,
      });

      await selectLimitAtMidPrice();

      expect(await findPnlRow()).toHaveTextContent('+$100 (+12.00%)');
    });

    it('omits the percentage when nothing is being closed', async () => {
      // A losing position closed at size 0: the $P&L is ±$0, and the row must
      // not show the position's RoE beside it (previously this rendered as a
      // green "+$0 (-12.00%)" because -100 × 0 is -0 and -0 < 0 is false).
      renderTreatmentSheet(
        createLongPositionForViews({
          unrealizedPnl: '-100',
          returnOnEquity: '-0.12',
        }),
      );

      fireEvent.press(
        await screen.findByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );
      // Clear the initialized USD amount ($2,500.00) down to nothing.
      for (let i = 0; i < 9; i += 1) {
        fireEvent.press(screen.getByTestId(KeypadTestIds.DELETE_BUTTON));
      }
      fireEvent.press(screen.getByText(strings('perps.deposit.done_button')));

      const pnlRow = await findPnlRow();
      expect(pnlRow).toHaveTextContent('+$0');
      expect(pnlRow).not.toHaveTextContent(/%/);
    });

    it('omits the percentage when the position RoE is unavailable', async () => {
      renderTreatmentSheet(createLongPositionForViews({ returnOnEquity: '' }));

      const pnlRow = await findPnlRow();
      expect(pnlRow).toHaveTextContent('+$100');
      expect(pnlRow).not.toHaveTextContent(/%/);
    });
  });
});
