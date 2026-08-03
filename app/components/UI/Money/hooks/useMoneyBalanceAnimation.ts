import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import {
  clearMoneyBalanceUserOp,
  isPersistedMoneyBalanceUsable,
  selectHasPendingMoneyBalanceUserOp,
  selectLastKnownMoneyBalance,
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
 * The displayed figure is seeded from the persisted last known balance so the
 * first fresh value of a session rolls up from what the user last saw, rather
 * than appearing from nothing. After that the figure only rolls for the user's
 * own deposits and withdrawals; background polls and share-price drift replace
 * it silently.
 *
 * @param amount - The freshest balance, undefined while loading or on error.
 * @returns The amount to render and whether to animate to it.
 */
export const useMoneyBalanceAnimation = (
  amount: number | undefined,
): UseMoneyBalanceAnimationResult => {
  const dispatch = useDispatch();
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const address = primaryMoneyAccount?.address;
  const currency = useSelector(selectCurrentCurrency);
  const lastKnownBalance = useSelector(selectLastKnownMoneyBalance);
  const hasPendingUserOp = useSelector(selectHasPendingMoneyBalanceUserOp);

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
    if (seed === undefined) {
      return undefined;
    }
    return { amount: toDisplayAmount(seed), animated: false };
  });

  // Mirrors `rendered` so the effect can read the committed value without
  // depending on it, which would re-run the effect on every animation flip.
  const renderedRef = useRef(rendered);

  useEffect(() => {
    if (amount === undefined) {
      return;
    }

    const nextAmount = toDisplayAmount(amount);
    const isIdentityChange = identityRef.current !== identity;
    if (isIdentityChange) {
      identityRef.current = identity;
      hasResolvedRef.current = false;
    }

    const isInitialResolution = !hasResolvedRef.current;
    hasResolvedRef.current = true;

    const previousAmount = renderedRef.current?.amount;
    const animated = shouldAnimateBalanceChange({
      nextAmount,
      previousAmount,
      isIdentityChange,
      isInitialResolution,
      hasPendingUserOp,
    });

    if (previousAmount === nextAmount) {
      return;
    }

    const next = { amount: nextAmount, animated };
    renderedRef.current = next;
    setRendered(next);

    if (hasPendingUserOp) {
      dispatch(clearMoneyBalanceUserOp());
    }
  }, [amount, identity, hasPendingUserOp, dispatch]);

  return {
    amount: rendered?.amount,
    animated: rendered?.animated ?? false,
  };
};

export default useMoneyBalanceAnimation;
