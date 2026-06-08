import Logger from '../../../../util/Logger';
import type { InitiateDepositOptions } from '../hooks/useMoneyAccount';

/**
 * A money action requested by an ephemeral surface (e.g. the "Add" or
 * "Transfer" bottom sheet) but executed elsewhere.
 *
 * Why a bus: deposit/withdrawal navigation rejects any pending transaction and
 * defers the navigation until it clears. That deferral lives in React state
 * inside `useConfirmNavigation`, so it dies if the component that owns the hook
 * unmounts. The sheets close themselves as part of the action, so they cannot
 * own it. Instead a long-lived executor (mounted for the whole Money tab) owns
 * the hooks, and the sheets hand the request to it through this bus.
 *
 * The handoff is a plain function call rather than navigation params because
 * the latter must be serializable (functions warn and break state
 * persistence). There is exactly one executor mounted at a time, so a single
 * listener slot is sufficient.
 */
export type MoneyAction =
  | { type: 'deposit'; options?: InitiateDepositOptions }
  | { type: 'withdrawal' };

type MoneyActionListener = (action: MoneyAction) => void;

let listener: MoneyActionListener | undefined;

/**
 * Registers the executor that runs money actions. Returns an unsubscribe to
 * call on unmount. Intended for a single long-lived executor.
 */
export function setMoneyActionListener(next: MoneyActionListener): () => void {
  listener = next;
  return () => {
    if (listener === next) {
      listener = undefined;
    }
  };
}

/**
 * Requests a money action. Runs synchronously in the executor's (mounted)
 * context so its `useConfirmNavigation` deferral survives the caller's unmount.
 */
export function requestMoneyAction(action: MoneyAction): void {
  if (!listener) {
    Logger.log(
      '[Money] requestMoneyAction dropped — no executor mounted',
      action.type,
    );
    return;
  }
  listener(action);
}
