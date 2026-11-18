import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { ensureError } from '../../../../../../util/errorUtils';
import { isUserRejectedError } from '../../../../../../util/errorHandling/isUserRejectedError';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../../../reducers';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { useConfirmNavigation } from '../../../../../Views/confirmations/hooks/useConfirmNavigation';
import type { PredictDepositEnvironment } from '../../../config/depositEnvironment';
import { PredictError, PredictErrorCode } from '../../../errors';
import {
  canReuseClientOperationId,
  createSimulatedTransferExecutor,
  createWalletTransferExecutor,
  payDeposit,
  startDeposit,
  type DepositOutcome,
  type DepositTransferExecutor,
  type DepositWorkflowDeps,
} from '../../../funding';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictHex,
  PredictVenueId,
} from '../../../types';
import { findNetworkClientId } from './useUsdcBalance';

/** Reads of a new deposit while the venue prepares its address: about ten
 * seconds at the default interval. */
const ADDRESS_POLL_ATTEMPTS = 5;

interface UseDepositFlowOptions {
  venueId: PredictVenueId;
  environment: PredictDepositEnvironment;
  /** The Funding Wallet's address; nothing runs without one. */
  fundingWallet: PredictHex | undefined;
  /** How often to read a new deposit while its address is prepared. */
  addressPollIntervalMs: number;
}

const logError = (error: unknown, message: string): void => {
  Logger.error(ensureError(error, 'PredictNext.deposit'), message);
};

/**
 * Connects the deposit screen to the deposit workflow (`funding/deposit`).
 * The workflow owns the order of the steps and every check; this hook
 * supplies its dependencies from the Engine and the store at the moment the
 * user acts, and answers each run's outcome to the screen.
 *
 * One Client Operation ID per deposit: a retry of the same amount after a
 * prepare that failed without an answer reuses it, so a lost answer never
 * creates a second deposit; every other retry makes a new one.
 */
export const useDepositFlow = ({
  venueId,
  environment,
  fundingWallet,
  addressPollIntervalMs,
}: UseDepositFlowOptions) => {
  const store = useStore<RootState>();
  const { navigateToConfirmation } = useConfirmNavigation();
  const [isWorking, setIsWorking] = useState(false);
  const isMountedRef = useRef(true);
  const isWorkingRef = useRef(false);
  const clientOperationRef = useRef<{ amount: string; id: string } | null>(
    null,
  );

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const executor = useMemo<DepositTransferExecutor>(
    () =>
      environment.transferMode === 'wallet'
        ? createWalletTransferExecutor({
            findNetworkClientId: (chainId) =>
              findNetworkClientId(Number.parseInt(chainId, 16)),
            addTransaction: (params, options) =>
              Engine.context.TransactionController.addTransaction(
                params,
                options,
              ),
            getTransaction: (id) =>
              Engine.context.TransactionController.state.transactions.find(
                (transaction) => transaction.id === id,
              ),
            // The bottom-sheet confirmation goes back to this screen when
            // the user confirms or rejects; the full-screen one would leave
            // Predict for Activity.
            presentConfirmation: () =>
              navigateToConfirmation({ forceBottomSheet: true }),
          })
        : createSimulatedTransferExecutor({
            log: (message, details) => DevLogger.log(message, details),
          }),
    [environment.transferMode, navigateToConfirmation],
  );

  const buildDeps = useCallback(
    (from: PredictHex): DepositWorkflowDeps => ({
      funding: {
        prepareDeposit: (params) =>
          Engine.controllerMessenger.call(
            'PredictFundingService:prepareDeposit',
            venueId,
            params,
            {
              kind: 'user-approved',
            },
          ),
        getDeposit: (operationId) =>
          Engine.controllerMessenger.call(
            'PredictFundingService:getDeposit',
            venueId,
            operationId,
          ),
        listOpenDeposits: () =>
          Engine.controllerMessenger.call(
            'PredictFundingService:listOpenDeposits',
            venueId,
          ),
        reportDepositTransfer: (operationId, params) =>
          Engine.controllerMessenger.call(
            'PredictFundingService:reportDepositTransfer',
            venueId,
            operationId,
            params,
          ),
        cancelDeposit: (operationId) =>
          Engine.controllerMessenger.call(
            'PredictFundingService:cancelDeposit',
            venueId,
            operationId,
          ),
      },
      executor,
      network: environment.network,
      from,
      walletAddresses: selectInternalAccounts(store.getState()).map(
        (account) => account.address,
      ),
      now: Date.now,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      addressPoll: {
        intervalMs: addressPollIntervalMs,
        attempts: ADDRESS_POLL_ATTEMPTS,
      },
      isUserRejection: (error) => isUserRejectedError(error, ''),
      logError,
    }),
    [addressPollIntervalMs, environment.network, executor, store, venueId],
  );

  const run = useCallback(
    async (
      work: (deps: DepositWorkflowDeps) => Promise<DepositOutcome>,
    ): Promise<DepositOutcome | undefined> => {
      if (!fundingWallet || isWorkingRef.current) {
        return undefined;
      }
      isWorkingRef.current = true;
      setIsWorking(true);
      let outcome: DepositOutcome;
      try {
        outcome = await work(buildDeps(fundingWallet));
      } catch (error) {
        // The workflow answers every expected failure; this is a bug guard.
        logError(error, 'PredictNext: the deposit workflow threw');
        outcome = {
          kind: 'failed',
          stage: 'prepare',
          error: PredictError.from(PredictErrorCode.UNKNOWN),
        };
      } finally {
        isWorkingRef.current = false;
      }
      if (!canReuseClientOperationId(outcome)) {
        clientOperationRef.current = null;
      }
      if (isMountedRef.current) {
        setIsWorking(false);
      }
      return outcome;
    },
    [buildDeps, fundingWallet],
  );

  /** Starts and pays a deposit of `amount`. The press that calls it is the
   * user's approval to sign the deposit request. */
  const start = useCallback(
    (amount: PredictAmount) =>
      run((deps) => {
        if (clientOperationRef.current?.amount !== amount) {
          clientOperationRef.current = { amount, id: uuidv4() };
        }
        return startDeposit(deps, {
          amount,
          clientOperationId: clientOperationRef.current.id,
        });
      }),
    [run],
  );

  /** Pays an open deposit the user chose to continue, for its own amount. */
  const payOpenDeposit = useCallback(
    (deposit: PredictDepositOperation) =>
      run((deps) => payDeposit(deps, deposit, deposit.amount)),
    [run],
  );

  /** Cancels an open deposit. Answers whether the backend cancelled it. */
  const cancelOpenDeposit = useCallback(
    async (deposit: PredictDepositOperation): Promise<boolean> => {
      try {
        await Engine.controllerMessenger.call(
          'PredictFundingService:cancelDeposit',
          venueId,
          deposit.operationId,
        );
        return true;
      } catch (error) {
        logError(error, 'PredictNext: failed to cancel an open deposit');
        return false;
      }
    },
    [venueId],
  );

  return { isWorking, start, payOpenDeposit, cancelOpenDeposit };
};
