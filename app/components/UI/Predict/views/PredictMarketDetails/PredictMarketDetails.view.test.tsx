/**
 * Component view tests for PredictMarketDetails.
 *
 * Run with: yarn jest -c jest.config.view.js PredictMarketDetails.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import {
  renderPredictMarketDetailsView,
  renderPredictMarketDetailsViewWithRoutes,
} from '../../../../../../tests/component-view/renderers/predictMarketDetails';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MOCK_PREDICT_MARKET } from '../../../../../../tests/component-view/fixtures/predict';

describe('PredictMarketDetails', () => {
  describe('initial load', () => {
    it('calls getMarket with the marketId from route params when the screen mounts', async () => {
      const getMarketSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarket',
      );
      getMarketSpy.mockResolvedValue(MOCK_PREDICT_MARKET);

      renderPredictMarketDetailsView({
        initialParams: { marketId: 'market-btc-1' },
      });

      await waitFor(() => {
        expect(getMarketSpy).toHaveBeenCalledWith(
          expect.objectContaining({ marketId: 'market-btc-1' }),
        );
      });

      getMarketSpy.mockRestore();
    });

    it('shows complete market data in the details screen after getMarket resolves', async () => {
      // Arrange
      const getMarketSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarket',
      );
      getMarketSpy.mockResolvedValue(MOCK_PREDICT_MARKET);
      const { findByTestId, findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: 'market-btc-1' },
      });

      // Assert — all significant fields of the loaded market are visible on screen.
      // The async resolution of getMarket is the event under test (not a render scenario).
      const screen = await findByTestId(
        PredictMarketDetailsSelectorsIDs.SCREEN,
      );
      await waitFor(() => {
        expect(
          within(screen).getByText(MOCK_PREDICT_MARKET.title),
        ).toBeOnTheScreen();
      });
      expect(await findByText(/Yes.*¢/)).toBeOnTheScreen();
      expect(await findByText(/No.*¢/)).toBeOnTheScreen();

      getMarketSpy.mockRestore();
    });

    it('calls trackGeoBlockTriggered when the user presses a bet button while ineligible', async () => {
      const trackGeoBlockSpy = jest.spyOn(
        Engine.context.PredictController,
        'trackGeoBlockTriggered',
      );
      const getMarketSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarket',
      );
      getMarketSpy.mockResolvedValue(MOCK_PREDICT_MARKET);

      const { findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: 'market-btc-1' },
      });

      // Bet button label is "Yes • {yesPercentage}¢"; press it while ineligible
      fireEvent.press(await findByText(/Yes.*¢/));

      await waitFor(() => {
        expect(trackGeoBlockSpy).toHaveBeenCalledWith(
          expect.objectContaining({ attemptedAction: 'predict_action' }),
        );
      });

      getMarketSpy.mockRestore();
      trackGeoBlockSpy.mockRestore();
    });

    it('calls trackMarketDetailsOpened when the market and positions finish loading', async () => {
      const trackSpy = jest.spyOn(
        Engine.context.PredictController,
        'trackMarketDetailsOpened',
      );
      const getMarketSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarket',
      );
      getMarketSpy.mockResolvedValue(MOCK_PREDICT_MARKET);

      renderPredictMarketDetailsView({
        initialParams: { marketId: 'market-btc-1' },
      });

      await waitFor(() => {
        expect(trackSpy).toHaveBeenCalledWith(
          expect.objectContaining({ marketId: 'market-btc-1' }),
        );
      });

      getMarketSpy.mockRestore();
      trackSpy.mockRestore();
    });
  });

  describe('back navigation', () => {
    it('navigates to the Predict root when the user presses back from the details screen', async () => {
      const getMarketSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarket',
      );
      getMarketSpy.mockResolvedValue(MOCK_PREDICT_MARKET);

      const { findByTestId } = renderPredictMarketDetailsViewWithRoutes({
        initialParams: { marketId: 'market-btc-1' },
        extraRoutes: [{ name: Routes.PREDICT.ROOT }],
      });

      await findByTestId(PredictMarketDetailsSelectorsIDs.SCREEN);

      fireEvent.press(
        await findByTestId(PredictMarketDetailsSelectorsIDs.BACK_BUTTON),
      );

      expect(
        await findByTestId(`route-${Routes.PREDICT.ROOT}`),
      ).toBeOnTheScreen();

      getMarketSpy.mockRestore();
    });
  });
});
