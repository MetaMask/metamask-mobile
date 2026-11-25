type ActivationToastDebtListener = () => void;

let owed = false;
const listeners = new Set<ActivationToastDebtListener>();

function emitActivationToastDebt(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/**
 * Records that the processing toaster was shown, so the active-membership
 * toaster is still owed. In memory only: a later app launch does not toast
 * for a plan that is already active.
 */
export function markActivationToastOwed(): void {
  if (owed) {
    return;
  }

  owed = true;
  emitActivationToastDebt();
}

/** Clears the owed active-membership toaster after it is shown or the payment fails. */
export function clearActivationToastDebt(): void {
  if (!owed) {
    return;
  }

  owed = false;
  emitActivationToastDebt();
}

/** Whether a processing toaster in this session still owes the active toaster. */
export function getActivationToastOwed(): boolean {
  return owed;
}

/**
 * Subscribes to changes of the owed flag.
 *
 * @param listener - Called after the flag changes.
 * @returns Unsubscribe.
 */
export function subscribeActivationToastDebt(
  listener: ActivationToastDebtListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
