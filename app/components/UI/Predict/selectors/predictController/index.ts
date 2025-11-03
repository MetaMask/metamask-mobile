import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import { PredictPositionStatus } from '../../types';

const selectPredictControllerState = (state: RootState) =>
  state.engine.backgroundState.PredictController;

const selectPredictPendingDeposits = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.pendingDeposits || {},
);

const selectPredictClaimablePositions = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.claimablePositions || {},
);

const selectPredictClaimablePositionsByAddress = ({
  address,
}: {
  address: string;
}) =>
  createSelector(
    selectPredictClaimablePositions,
    (claimablePositions) => claimablePositions[address] || [],
  );

const selectPredictWonPositions = ({ address }: { address: string }) =>
  createSelector(
    selectPredictClaimablePositionsByAddress({ address }),
    (claimablePositions) =>
      claimablePositions.filter(
        (position) => position.status === PredictPositionStatus.WON,
      ),
  );

const selectPredictWinFiat = ({ address }: { address: string }) =>
  createSelector(selectPredictWonPositions({ address }), (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.currentValue, 0),
  );

const selectPredictWinPnl = ({ address }: { address: string }) =>
  createSelector(selectPredictWonPositions({ address }), (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.cashPnl, 0),
  );

const selectPredictBalances = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.balances || {},
);

const selectPredictBalanceByAddress = ({
  providerId,
  address,
}: {
  providerId: string;
  address: string;
}) =>
  createSelector(
    selectPredictBalances,
    (balances) => balances[providerId]?.[address]?.balance || 0,
  );

const selectPredictPendingDepositByAddress = ({
  providerId,
  address,
}: {
  providerId: string;
  address: string;
}) =>
  createSelector(
    selectPredictPendingDeposits,
    (pendingDeposits) => pendingDeposits[providerId]?.[address] || false,
  );

const selectPredictIsAgreementAccepted = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.isAgreementAccepted || {},
);

const selectPredictIsAgreementAcceptedByAddress = ({
  providerId,
  address,
}: {
  providerId: string;
  address: string;
}) =>
  createSelector(
    selectPredictIsAgreementAccepted,
    (isAgreementAccepted) =>
      isAgreementAccepted[providerId]?.[address] || false,
  );

export {
  selectPredictControllerState,
  selectPredictPendingDeposits,
  selectPredictClaimablePositions,
  selectPredictClaimablePositionsByAddress,
  selectPredictWonPositions,
  selectPredictWinFiat,
  selectPredictWinPnl,
  selectPredictBalances,
  selectPredictBalanceByAddress,
  selectPredictPendingDepositByAddress,
  selectPredictIsAgreementAccepted,
  selectPredictIsAgreementAcceptedByAddress,
};
