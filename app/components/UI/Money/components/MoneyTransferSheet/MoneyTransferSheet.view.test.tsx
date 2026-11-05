import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  clearPendingTransactions,
  pendingTransaction,
  PREDICT_FUNDING_PENDING_TX_ID,
  PredictFundingRendererTestIds,
  renderMoneyTransferSheetView,
  restorePredictFundingEngine,
  seedEngineTransactions,
  switchPredictVenue,
  type PredictFundingVenue,
} from '../../../../../../tests/component-view/renderers/predictFunding';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';

const routeProbe = (routeName: string) => `route-${routeName}`;

const mockDepositWithConfirmation = jest.mocked(
  Engine.context.PredictController.depositWithConfirmation,
);

const openSheet = async (
  venue: PredictFundingVenue,
  options: { pending?: boolean } = {},
) => {
  const transactions = options.pending ? [pendingTransaction()] : [];
  const rejectRequest = seedEngineTransactions(transactions);
  const view = renderMoneyTransferSheetView({ venue, transactions });
  fireEvent.press(
    await view.findByTestId(PredictFundingRendererTestIds.OPEN_SHEET),
  );
  await view.findByTestId(MoneyTransferSheetTestIds.CONTAINER);
  return { ...view, rejectRequest };
};

describeForPlatforms('MoneyTransferSheet Predict funding gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDepositWithConfirmation.mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    restorePredictFundingEngine();
  });

  describe('while Polymarket is active', () => {
    it('offers the Predictions account transfer', async () => {
      const { getByTestId } = await openSheet('polymarket');

      expect(
        getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      ).toBeEnabled();
      expect(
        getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
      ).toBeOnTheScreen();
    });

    it('opens the Predict deposit confirmation and starts the deposit', async () => {
      const { getByTestId, findByTestId } = await openSheet('polymarket');

      fireEvent.press(
        getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      );

      expect(
        await findByTestId(routeProbe(Routes.PREDICT.ROOT)),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(mockDepositWithConfirmation).toHaveBeenCalledTimes(1),
      );
    });

    it('still lands on the confirmation when the deposit fails to start', async () => {
      mockDepositWithConfirmation.mockRejectedValueOnce(
        new Error('deposit failed'),
      );
      const { getByTestId, findByTestId, queryByTestId } =
        await openSheet('polymarket');

      fireEvent.press(
        getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      );

      expect(
        await findByTestId(routeProbe(Routes.PREDICT.ROOT)),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(mockDepositWithConfirmation).toHaveBeenCalledTimes(1),
      );
      expect(queryByTestId(MoneyTransferSheetTestIds.CONTAINER)).toBeNull();
    });
  });

  describe('while Kalshi is active without a funding implementation', () => {
    it('does not render the Predictions account transfer', async () => {
      const { queryByTestId, getByTestId } = await openSheet('kalshi');

      expect(
        queryByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      ).toBeNull();
      expect(
        getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
      ).toBeOnTheScreen();
    });

    it('removes the transfer when the Active Venue moves to Kalshi while the sheet is open', async () => {
      const view = await openSheet('polymarket');
      expect(
        view.getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      ).toBeOnTheScreen();

      await switchPredictVenue(view, 'kalshi');

      expect(
        view.queryByTestId(
          MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION,
        ),
      ).toBeNull();
    });
  });

  describe('a transfer deferred behind a pending confirmation', () => {
    it('starts the Polymarket deposit once the rejected confirmation clears', async () => {
      const view = await openSheet('polymarket', { pending: true });

      fireEvent.press(
        view.getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      );
      expect(view.rejectRequest).toHaveBeenCalledWith(
        PREDICT_FUNDING_PENDING_TX_ID,
        expect.anything(),
      );
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();

      await clearPendingTransactions(view);

      expect(
        await view.findByTestId(routeProbe(Routes.PREDICT.ROOT)),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(mockDepositWithConfirmation).toHaveBeenCalledTimes(1),
      );
    });

    it('starts nothing when the Active Venue moves to Kalshi before the rejection clears', async () => {
      const view = await openSheet('polymarket', { pending: true });

      fireEvent.press(
        view.getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      );
      expect(view.rejectRequest).toHaveBeenCalledWith(
        PREDICT_FUNDING_PENDING_TX_ID,
        expect.anything(),
      );

      await switchPredictVenue(view, 'kalshi');
      await clearPendingTransactions(view);

      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
      expect(view.queryByTestId(routeProbe(Routes.PREDICT.ROOT))).toBeNull();
      expect(
        view.getByTestId(MoneyTransferSheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(
          MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION,
        ),
      ).toBeNull();
    });
  });
});
