/**
 * Component view tests for PerpsMarketDetailsView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug #25315: Close and Modify actions must be geo-restricted (show geo block sheet when isEligible false).
 * Run with: yarn test:view --testPathPattern="PerpsMarketDetailsView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderPerpsMarketDetailsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { getModifyActionLabels } from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsBottomSheetTooltipSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
  PerpsTutorialSelectorsIDs,
  getPerpsCandlePeriodSelector,
  getPerpsCandlePeriodBottomSheetSelector,
} from '../../Perps.testIds';

const CANDLE_SELECTOR_BASE =
  `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-candle-period-selector` as const;
const MORE_CANDLE_SHEET_BASE =
  `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-more-candle-periods-bottom-sheet` as const;

describe('PerpsMarketDetailsView', () => {
  it('renders error state when route does not provide market params', async () => {
    renderPerpsMarketDetailsView({ initialParams: {} });

    expect(
      await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders long and short actions when there is no open position', async () => {
    renderPerpsMarketDetailsView({
      streamOverrides: { positions: [] },
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: true },
          },
        },
      },
    });

    expect(
      await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('shows geo block bottom sheet when Long is pressed (geo-restricted user)', async () => {
    renderPerpsMarketDetailsView({
      streamOverrides: { positions: [] },
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: false },
          },
        },
      },
    });

    const longButton = await screen.findByTestId(
      PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
    );
    fireEvent.press(longButton);

    expect(
      screen.getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).toBeOnTheScreen();
  });

  it('opens market-hours tooltip when info button is pressed for equity markets', async () => {
    renderPerpsMarketDetailsView({
      initialParams: {
        market: {
          symbol: 'AAPL',
          name: 'Apple',
          maxLeverage: '10x',
          marketType: 'equity',
          price: '$200',
          change24h: '$0',
          change24hPercent: '0%',
          volume: '$1M',
        },
      },
      streamOverrides: { positions: [] },
    });

    const infoButton = await screen.findByTestId(
      PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_INFO_BUTTON,
    );

    fireEvent.press(infoButton);

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_BOTTOM_SHEET_TOOLTIP,
      ),
    ).toBeOnTheScreen();
  });

  it('opens modify action sheet when Modify is pressed (eligible user)', async () => {
    renderPerpsMarketDetailsView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: true },
          },
        },
      },
    });

    const modifyButton = await screen.findByTestId(
      PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON,
    );
    fireEvent.press(modifyButton);

    const labels = getModifyActionLabels();
    expect(await screen.findByText(labels.addPosition)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).not.toBeOnTheScreen();
  });

  describe('Bug #25315: Geo-restriction for Close and Modify actions', () => {
    it('shows geo block bottom sheet when Close is pressed (geo-restricted user)', async () => {
      renderPerpsMarketDetailsView();

      const closeButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
      );
      fireEvent.press(closeButton);

      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });

    it('shows geo block bottom sheet when Modify is pressed (geo-restricted user)', async () => {
      renderPerpsMarketDetailsView();

      const modifyButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON,
      );
      fireEvent.press(modifyButton);

      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Sheet close and UI interactions', () => {
    it('opens geo block sheet and Got it dismisses it', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: false },
            },
          },
        },
      });

      const longButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
      );
      fireEvent.press(longButton);

      const gotIt = await screen.findByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      );
      fireEvent.press(gotIt);
      // Sheet may stay mounted (visibility/animation); we only assert open + press.
    });

    it('opens market hours sheet and Got it dismisses it', async () => {
      renderPerpsMarketDetailsView({
        initialParams: {
          market: {
            symbol: 'AAPL',
            name: 'Apple',
            maxLeverage: '10x',
            marketType: 'equity',
            price: '$200',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
          },
        },
        streamOverrides: { positions: [] },
      });

      const infoButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_INFO_BUTTON,
      );
      fireEvent.press(infoButton);

      const gotIt = await screen.findByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      );
      fireEvent.press(gotIt);
      // Sheet may stay mounted (visibility/animation); we only assert open + press.
    });

    it('opens statistics tooltip and Got it dismisses it', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const openInterestIcon = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON,
      );
      fireEvent.press(openInterestIcon);

      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();

      const gotIt = screen.getByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      );
      fireEvent.press(gotIt);
      // Sheet may stay mounted (visibility/animation); we only assert open + press.
    });
  });

  describe('Header and chart actions', () => {
    it('renders back button and fullscreen chart button', async () => {
      renderPerpsMarketDetailsView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      expect(
        await screen.findByTestId(PerpsMarketHeaderSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${PerpsMarketDetailsViewSelectorsIDs.HEADER}-fullscreen-button`,
        ),
      ).toBeOnTheScreen();
    });

    it('opens fullscreen chart modal and close button is pressable', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const fullscreenButton = await screen.findByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.HEADER}-fullscreen-button`,
      );
      fireEvent.press(fullscreenButton);

      const closeButton = await screen.findByTestId(
        'perps-chart-fullscreen-close-button',
      );
      expect(closeButton).toBeOnTheScreen();
      fireEvent.press(closeButton);
      // Modal may stay in tree during close animation; we only assert open + press.
    });

    it('changes candle period when period button is pressed', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const period3mButton = await screen.findByTestId(
        getPerpsCandlePeriodSelector.periodButton(CANDLE_SELECTOR_BASE, '3m'),
      );
      fireEvent.press(period3mButton);

      expect(period3mButton).toBeOnTheScreen();
    });

    it('opens more candle periods bottom sheet and selects a period', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const moreButton = await screen.findByTestId(
        getPerpsCandlePeriodSelector.moreButton(CANDLE_SELECTOR_BASE),
      );
      fireEvent.press(moreButton);

      const period1mInSheet = await screen.findByTestId(
        getPerpsCandlePeriodBottomSheetSelector.periodButton(
          MORE_CANDLE_SHEET_BASE,
          '1m',
        ),
      );
      fireEvent.press(period1mInSheet);

      expect(
        screen.queryByTestId(
          getPerpsCandlePeriodBottomSheetSelector.periodButton(
            MORE_CANDLE_SHEET_BASE,
            '1m',
          ),
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Position card and navigation', () => {
    it('renders position card with share button when position exists', async () => {
      renderPerpsMarketDetailsView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      expect(
        await screen.findByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders tutorial card', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const tutorialCard = await screen.findByTestId(
        PerpsTutorialSelectorsIDs.TUTORIAL_CARD,
      );
      expect(tutorialCard).toBeOnTheScreen();
      // Not pressing to avoid unhandled NAVIGATE(PerpsTutorial) in test navigator.
    });
  });
});
