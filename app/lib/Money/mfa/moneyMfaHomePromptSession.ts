// Not persisted: the prompt comes back in a later session unless dismissed.
let hasPrompted = false;

/** Whether the wallet home prompt opened in this app session. */
export const moneyMfaHomePromptSession = {
  hasPrompted: (): boolean => hasPrompted,
  markPrompted: () => {
    hasPrompted = true;
  },
  reset: () => {
    hasPrompted = false;
  },
};
