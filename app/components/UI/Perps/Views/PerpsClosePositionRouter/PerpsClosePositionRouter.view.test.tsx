/**
 * Component view tests for the close-position A/B router.
 * The assignment comes from the remote feature flag in Redux, not a mocked hook.
 */
import '../../../../../../tests/component-view/mocks';

import { act, screen, waitFor } from '@testing-library/react-native';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
  createScreenVsBottomSheetAssignmentForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsClosePositionRouter } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { ScreenVsBottomSheetVariant } from '../../abTestConfig';
import {
  PerpsClosePositionBottomSheetSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
} from '../../Perps.testIds';

const TIMEOUT_MS = 5000;

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
  beforeEach(() => {
    jest.clearAllMocks();
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
});
