import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { RootState } from '../../../../../../reducers';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';
import type { QuickBuyFundingOptions } from '../../../../QuickBuy/types';
import { detachQuickBuyTradeStateCallback } from '../../../../QuickBuy/quickBuyTradeTracker';
import type { CollectorCryptPack, SolanaAccountRef } from '../types';
import { getErrorMessageFromUnknown } from '../utils/errorMessages';
import { parseUsdcAmount } from '../utils/format';
import { getFundingAmountUsd } from '../utils/packs';
import { selectCollectorCryptInternalAccount } from '../selectors/account';
import { showErrorToast } from '../../../hooks/toasts';
import type { UsdcBalance } from './useUsdcBalance';
import { isGachaFundingRoute } from './fundingNavigation';

const BALANCE_SYNC_TIMEOUT = 5_000;
const BALANCE_SYNC_INTERVAL = 1_000;

type FundingPhase = 'editing' | 'funding' | 'checking' | 'purchasing';

interface FundingSession {
  account: SolanaAccountRef;
  pack?: CollectorCryptPack;
  phase: FundingPhase;
  transactionId?: string;
}

interface PackFundingOptions {
  account?: SolanaAccountRef;
  balance: UsdcBalance;
  /** Gates new intents only; covering the owning screen does not revoke one. */
  isFocused: boolean;
  onPurchased: (memo: string) => void;
}

/**
 * Whether revoking the session withdraws an automatic opening already promised
 * to the user, i.e. a pack intent whose funding was submitted.
 *
 * @param session - Active funding session.
 * @returns True when the user must be told about the revocation.
 */
const promisesAutoOpen = (session: FundingSession | undefined): boolean =>
  session?.pack !== undefined && session.phase !== 'editing';

/**
 * One foreground purchase intent; only its settled Quick Buy trade can resume
 * it. The intent survives screens pushed above its owner (cards, Quick Buy
 * settings). An explicit cancel, a failure, an account switch, leaving Gacha
 * or the owner's unmount revokes it.
 */
export const usePackFunding = ({
  account,
  balance,
  isFocused,
  onPurchased,
}: PackFundingOptions) => {
  const store = useStore<RootState>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const rootNavigation = useMemo(() => {
    let root = navigation;
    let parent = root.getParent<NavigationProp<ParamListBase> | undefined>();
    while (parent) {
      root = parent;
      parent = root.getParent<NavigationProp<ParamListBase> | undefined>();
    }
    return root;
  }, [navigation]);
  const activeSession = useRef<FundingSession | undefined>(undefined);
  const syncDeadline = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncRetry = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [phase, setPhase] = useState<FundingPhase>();
  const [error, setError] = useState<string>();
  const [quickBuy, setQuickBuy] = useState<QuickBuyFundingOptions>();

  const cancel = useCallback(() => {
    if (activeSession.current?.transactionId) {
      detachQuickBuyTradeStateCallback(activeSession.current.transactionId);
    }
    activeSession.current = undefined;
    clearTimeout(syncDeadline.current);
    clearTimeout(syncRetry.current);
    setQuickBuy(undefined);
    setPhase(undefined);
  }, []);

  /** Revokes the intent and tells the user once if a pack was promised. */
  const revoke = useCallback(
    (notify: (message: string) => void) => {
      if (!activeSession.current) return;
      const shouldNotify = promisesAutoOpen(activeSession.current);
      cancel();
      if (shouldNotify) {
        notify(strings('gacha.funding.auto_open_cancelled'));
      }
    },
    [cancel],
  );

  // An intent belongs to one account: switching revokes its timers, trade
  // callback and sheet. The submitted funding trade continues and remains
  // visible in Activity.
  const accountId = account?.id;
  const accountAddress = account?.address;
  useEffect(() => {
    const session = activeSession.current;
    if (
      session &&
      (session.account.id !== accountId ||
        session.account.address !== accountAddress)
    ) {
      revoke(setError);
    }
  }, [accountId, accountAddress, revoke]);

  // A sibling module can cover the still-mounted Gacha stack. Observe the
  // root navigator, rather than treating the owning screen's blur as a leave.
  useEffect(
    () =>
      rootNavigation.addListener('state', () => {
        if (!isGachaFundingRoute(rootNavigation.getState())) {
          revoke(showErrorToast);
        }
      }),
    [rootNavigation, revoke],
  );

  // Also revoke when the owner is removed from its navigator.
  useEffect(() => () => revoke(showErrorToast), [revoke]);

  const isCurrent = useCallback(
    (session: FundingSession) => {
      const selected = selectCollectorCryptInternalAccount(store.getState());
      return (
        activeSession.current === session &&
        isGachaFundingRoute(rootNavigation.getState()) &&
        selected?.id === session.account.id &&
        selected?.address === session.account.address
      );
    },
    [store, rootNavigation],
  );

  const fail = useCallback(
    (session: FundingSession, message: string) => {
      if (!isCurrent(session)) {
        return;
      }
      cancel();
      setError(message);
    },
    [cancel, isCurrent],
  );

  const resume = useCallback(
    async (session: FundingSession) => {
      session.phase = 'checking';
      setPhase('checking');
      syncDeadline.current = setTimeout(() => {
        fail(session, strings('gacha.funding.balance_not_ready'));
      }, BALANCE_SYNC_TIMEOUT);

      const checkBalance = async () => {
        if (!isCurrent(session)) {
          return;
        }
        const received = await balance.refresh();
        if (!isCurrent(session)) {
          return;
        }
        if (!session.pack) {
          cancel();
          return;
        }
        if (
          received !== undefined &&
          received >= parseUsdcAmount(session.pack.price)
        ) {
          clearTimeout(syncDeadline.current);
          session.phase = 'purchasing';
          setPhase('purchasing');
          try {
            const { code, name, price } = session.pack;
            const memo = await Engine.context.GachaController.generatePack({
              account: session.account,
              pack: { code, name, price },
            });
            if (isCurrent(session)) {
              cancel();
              onPurchased(memo);
            } else {
              // A late unsigned preparation must not restore an abandoned
              // purchase through the operation's View / resume banner.
              Engine.context.GachaController.dismissOperation({
                account: session.account,
                memo,
              });
            }
          } catch (purchaseError) {
            fail(session, getErrorMessageFromUnknown(purchaseError));
          }
          return;
        }
        syncRetry.current = setTimeout(() => {
          void checkBalance();
        }, BALANCE_SYNC_INTERVAL);
      };
      await checkBalance();
    },
    [balance.refresh, cancel, fail, isCurrent, onPurchased],
  );

  const open = useCallback(
    (pack?: CollectorCryptPack) => {
      if (!account || !isFocused || activeSession.current) {
        return;
      }
      const session: FundingSession = {
        account: { ...account },
        pack,
        phase: 'editing',
      };
      activeSession.current = session;
      setError(undefined);
      setPhase('editing');
      setQuickBuy({
        destinationAddress: account.address,
        initialAmountUsd: pack
          ? getFundingAmountUsd(pack.price, balance.baseUnits)
          : undefined,
        onTradeStateChange: (event) => {
          if (event.status === 'submitted') {
            session.transactionId = event.transactionId;
            if (!isCurrent(session)) {
              // Submission can finish after the host has already cancelled.
              detachQuickBuyTradeStateCallback(event.transactionId);
              return;
            }
          }
          if (!isCurrent(session)) {
            return;
          }
          switch (event.status) {
            case 'submitting':
            case 'submitted':
              // Submission begins before Quick Buy dismisses its sheet.
              if (session.phase === 'editing') {
                session.phase = 'funding';
                setPhase('funding');
              }
              break;
            case 'complete':
              if (session.phase === 'funding') {
                void resume(session);
              }
              break;
            case 'failed':
              if (session.phase === 'funding') {
                fail(session, strings('gacha.funding.failed'));
              }
              break;
          }
        },
      });
    },
    [account, balance.baseUnits, fail, isCurrent, isFocused, resume],
  );

  const closeQuickBuy = useCallback(() => {
    setQuickBuy(undefined);
    if (activeSession.current?.phase === 'editing') {
      cancel();
    }
  }, [cancel]);

  return {
    open,
    quickBuy,
    closeQuickBuy,
    cancel,
    phase,
    pendingPack: activeSession.current?.pack,
    isBusy: phase !== undefined,
    canCancel: phase === 'funding' || phase === 'checking',
    error,
    dismissError: () => setError(undefined),
  };
};
