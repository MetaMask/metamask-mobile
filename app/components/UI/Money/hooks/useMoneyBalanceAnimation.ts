import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import {
  clearMoneyBalanceUserOp,
  isPersistedMoneyBalanceUsable,
  selectLastKnownMoneyBalance,
  selectMoneyBalanceUserOpStatus,
} from '../../../../core/redux/slices/moneyBalance';
import {
  shouldAnimateBalanceChange,
  toDisplayAmount,
} from '../utils/balanceAnimation';
import useMoneyAccountInfo from './useMoneyAccountInfo';

interface RenderedBalance {
  amount: number;
  animated: boolean;
}

interface UseMoneyBalanceAnimationResult {
  /** The amount to render, undefined until a balance is available. */
  amount: number | undefined;
  /** Whether the current amount should roll in rather than appear instantly. */
  animated: boolean;
}

/**
 * Decides what the balance renders and whether that render animates.
 *
 * The figure is seeded from the persisted last known balance so the first fresh
 * value of a session rolls up from what the user last saw, rather than appearing
 * from nothing. After that it only rolls for the user's own deposits and
 * withdrawals; background polls and share-price drift replace it silently.
 *
 * @param amount - The freshest balance, undefined while loading or on error.
 * @returns The amount to render and whether to animate to it.
 */
const useMoneyBalanceAnimation = (
  amount: number | undefined,
): UseMoneyBalanceAnimationResult => {
  const dispatch = useDispatch();
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const address = primaryMoneyAccount?.address;
  const currency = useSelector(selectCurrentCurrency);
  const lastKnownBalance = useSelector(selectLastKnownMoneyBalance);
  const userOpStatus = useSelector(selectMoneyBalanceUserOpStatus);

  const identity = `${address ?? ''}|${currency}`;
  const identityRef = useRef(identity);
  const hasResolvedRef = useRef(false);

  const [rendered, setRendered] = useState<RenderedBalance | undefined>(() => {
    const seed = isPersistedMoneyBalanceUsable(lastKnownBalance, {
      address,
      currency,
    })
      ? lastKnownBalance.amount
      : undefined;
    return seed === undefined
      ? undefined
      : { amount: toDisplayAmount(seed), animated: false };
  });

  const renderedRef = useRef(rendered);

  useEffect(() => {
    if (amount === undefined) {
      return undefined;
    }

    const nextAmount = toDisplayAmount(amount);
    const isIdentityChange = identityRef.current !== identity;
    if (isIdentityChange) {
      identityRef.current = identity;
      hasResolvedRef.current = false;
    }

    const isInitialResolution = !hasResolvedRef.current;
    hasResolvedRef.current = true;

    const hasUserOpSignal = userOpStatus !== 'none';
    const previousAmount = renderedRef.current?.amount;
    if (previousAmount === nextAmount) {
      // The figure a settled operation produced was already in the anchor —
      // another surface refreshed it while Money home was away — so nothing is
      // left to roll and the signal is dropped rather than spent by a later
      // poll. A refresh still running, or a balance already being watched, has
      // its figure still to come.
      if (isInitialResolution && userOpStatus === 'pending') {
        dispatch(clearMoneyBalanceUserOp());
      }
      return undefined;
    }

    const animated = shouldAnimateBalanceChange({
      nextAmount,
      previousAmount,
      isIdentityChange,
      isInitialResolution,
      hasUserOpSignal,
    });

    const commit = () => {
      renderedRef.current = { amount: nextAmount, animated };
      setRendered(renderedRef.current);
      if (hasUserOpSignal) {
        dispatch(clearMoneyBalanceUserOp());
      }
    };

    if (!animated) {
      commit();
      return undefined;
    }

    const frame = requestAnimationFrame(commit);
    return () => cancelAnimationFrame(frame);
  }, [amount, identity, userOpStatus, dispatch]);

  const isStaleIdentity = identityRef.current !== identity;

  return {
    amount: isStaleIdentity ? undefined : rendered?.amount,
    animated: isStaleIdentity ? false : (rendered?.animated ?? false),
  };
};

export default useMoneyBalanceAnimation;
