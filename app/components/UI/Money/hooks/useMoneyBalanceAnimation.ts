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
    return seed === undefined
      ? undefined
      : { amount: toDisplayAmount(seed), animated: false };
  });

  // Mirrors `rendered` so the effect can read the committed value without
  // depending on it, which would re-run on every animation flip.
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

    const previousAmount = renderedRef.current?.amount;
    if (previousAmount === nextAmount) {
      return undefined;
    }

    const animated = shouldAnimateBalanceChange({
      nextAmount,
      previousAmount,
      isIdentityChange,
      isInitialResolution,
      hasPendingUserOp,
    });

    const commit = () => {
      renderedRef.current = { amount: nextAmount, animated };
      setRendered(renderedRef.current);
      if (hasPendingUserOp) {
        dispatch(clearMoneyBalanceUserOp());
      }
    };

    if (!animated) {
      commit();
      return undefined;
    }

    // NumberFlow renders static text until it has measured the font, and a value
    // changing before then lands without animating. A cached balance has no
    // loading phase to measure during, so the roll waits a frame for it.
    const frame = requestAnimationFrame(commit);
    return () => cancelAnimationFrame(frame);
  }, [amount, identity, hasPendingUserOp, dispatch]);

  // `rendered` still holds the previous account's figure until the effect
  // commits — reporting it would show one account's balance under another's.
  const isStaleIdentity = identityRef.current !== identity;

  return {
    amount: isStaleIdentity ? undefined : rendered?.amount,
    animated: isStaleIdentity ? false : (rendered?.animated ?? false),
  };
};

export default useMoneyBalanceAnimation;
