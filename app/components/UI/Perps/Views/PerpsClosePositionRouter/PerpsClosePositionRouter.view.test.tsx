/**
 * Component view tests for the close-position A/B router.
 * The assignment comes from the remote feature flag in Redux, not a mocked hook.
 */
import '../../../../../../tests/component-view/mocks';

import { act, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
  createScreenVsBottomSheetAssignmentForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsClosePositionRouter } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import { ScreenVsBottomSheetVariant } from '../../abTestConfig';
import {
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

const renderWithVariant = (variant?: ScreenVsBottomSheetVariant) => {
  const position = createLongPositionForViews();

  const result = renderPerpsClosePositionRouter({
    initialParams: { position },
    overrides: variant
      ? createScreenVsBottomSheetAssignmentForViews(variant)
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
        price: '2500',
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
});
