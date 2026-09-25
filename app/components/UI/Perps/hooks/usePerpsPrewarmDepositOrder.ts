import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  withPendingTransactionActiveAbTests,
  type TransactionActiveAbTestEntry,
} from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { selectPerpsProvider } from '../selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  discardPrewarmedDepositOrder,
  prewarmDepositOrder,
  resolveDepositOrderProvider,
} from '../utils/prewarmedDepositOrder';
import { usePerpsConnection } from './usePerpsConnection';
import { usePerpsTrading } from './usePerpsTrading';

/** Lighter trades from its own balance, so it has no deposit-with-order route. */
const LIGHTER_PROVIDER = 'lighter';

export interface UsePerpsPrewarmDepositOrderParams {
  /**
   * Whether prewarming is allowed — callers should require the trade buttons to
   * actually be usable (eligible user, trade entry point present).
   */
  enabled: boolean;
  /** Provider of the market being viewed, when it pins one. */
  marketProviderId?: string;
  /** AB test attribution to bind to the prepared transaction. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

/**
 * Prepares the deposit-with-order transaction while the user is still looking at
 * a market, so tapping Long/Short opens the trade confirmation without waiting
 * on transaction creation and approval queueing.
 *
 * The prepared transaction is rejected when the screen loses focus unless
 * `navigateToOrder` claimed it, so an untouched market never leaves an
 * unapproved transaction behind.
 */
export function usePerpsPrewarmDepositOrder({
  enabled,
  marketProviderId,
  transactionActiveAbTests,
}: UsePerpsPrewarmDepositOrderParams): void {
  const { depositWithOrder } = usePerpsTrading();
  const { isInitialized } = usePerpsConnection();
  const activeProvider = useSelector(selectPerpsProvider);
  const accountAddress = useSelector(selectPerpsSelectedAccountAddress);

  const depositProvider = resolveDepositOrderProvider(activeProvider);
  // A market pinned to another provider needs a provider switch first, which
  // this prewarm deliberately does not perform.
  const requiresProviderSwitch =
    marketProviderId !== undefined && marketProviderId !== depositProvider;
  const canPrewarm =
    enabled &&
    isInitialized &&
    !requiresProviderSwitch &&
    depositProvider !== LIGHTER_PROVIDER;

  // Kept out of the focus effect's dependencies so an unstable AB test array or
  // controller callback cannot discard and re-create the transaction on render.
  const latestRef = useRef({ depositWithOrder, transactionActiveAbTests });
  useEffect(() => {
    latestRef.current = { depositWithOrder, transactionActiveAbTests };
  }, [depositWithOrder, transactionActiveAbTests]);

  useFocusEffect(
    useCallback(() => {
      if (!canPrewarm || !accountAddress) {
        return undefined;
      }

      let aborted = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (aborted) {
          return;
        }

        const {
          depositWithOrder: createDeposit,
          transactionActiveAbTests: abTests,
        } = latestRef.current;

        prewarmDepositOrder(
          { accountAddress, providerId: depositProvider },
          () => withPendingTransactionActiveAbTests(abTests, createDeposit),
        )?.catch((error: unknown) => {
          // Prewarming is an optimization: a failure just means the tap falls
          // back to creating the transaction itself.
          DevLogger.log(
            '[usePerpsPrewarmDepositOrder] Failed to prewarm deposit order',
            error,
          );
        });
      });

      return () => {
        aborted = true;
        task.cancel();
        discardPrewarmedDepositOrder();
      };
    }, [canPrewarm, accountAddress, depositProvider]),
  );
}
