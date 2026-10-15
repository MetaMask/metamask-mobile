/**
 * Design-preview behavior for testing transaction verification without
 * requiring a funded Money account or broadcasting a real transaction.
 */
export const MONEY_SEND_VERIFICATION_PROTOTYPE_ENABLED = true;

let isFallbackSendActive = false;

export const beginPrototypeMoneySendFallback = () => {
  isFallbackSendActive = true;
};

export const consumePrototypeMoneySendFallback = () => {
  const wasActive = isFallbackSendActive;
  isFallbackSendActive = false;
  return wasActive;
};

export const isPrototypeMoneySendFallbackActive = () => isFallbackSendActive;

export const resetPrototypeMoneySendFallback = () => {
  isFallbackSendActive = false;
};
