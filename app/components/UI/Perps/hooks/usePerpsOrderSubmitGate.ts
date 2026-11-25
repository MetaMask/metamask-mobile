import { useCallback, useLayoutEffect, useRef } from 'react';
import type {
  OrderFormState,
  PerpsProviderType,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import {
  usePerpsAccountSupport,
  type UsePerpsAccountSupportReturn,
} from './usePerpsAccountSupport';

export type SubmitOrigin = { origin: 'userTap' } | { origin: 'postDeposit' };
type GateDecision =
  | { status: 'continue'; isRetired: () => boolean }
  | { status: 'abort' }
  | { status: 'accountUnsupported' };

/** Bind an async venue decision to the draft and lifecycle that requested it. */
export function usePerpsOrderSubmitGate(
  checkAccountSupport: UsePerpsAccountSupportReturn['checkAccountSupport'],
  inputKey: string,
  liteContext?: {
    isDismissedRef: { readonly current: boolean };
    readContextKey: UsePerpsAccountSupportReturn['readContextKey'];
  },
) {
  const isDismissedRef = liteContext?.isDismissedRef;
  const readContextKey = liteContext?.readContextKey;
  const committedKey = useRef(inputKey);
  useLayoutEffect(() => {
    committedKey.current = inputKey;
  }, [inputKey]);
  const generation = useRef(0);
  const retireAttempts = useCallback(() => {
    generation.current += 1;
  }, []);
  const checkBeforeSubmit = useCallback(
    async (
      providerId: PerpsProviderType | undefined,
      { origin }: SubmitOrigin,
    ): Promise<GateDecision> => {
      const attempt = generation.current;
      // A committed deposit can outlive the view. Re-read the venue context
      // from the store even when the form can no longer rerender.
      const contextAtSubmit = readContextKey?.(providerId);
      const isRetired = () =>
        inputKey !== committedKey.current ||
        readContextKey?.(providerId) !== contextAtSubmit ||
        (origin === 'userTap' &&
          (Boolean(isDismissedRef?.current) || generation.current !== attempt));
      const support =
        origin === 'postDeposit'
          ? await checkAccountSupport(providerId, { showExplanation: false })
          : await checkAccountSupport(providerId);
      if (
        isRetired() ||
        support === 'stale' ||
        (support === 'unmounted' && origin === 'userTap')
      )
        return { status: 'abort' };
      if (support === 'unsupported') return { status: 'accountUnsupported' };
      return { status: 'continue', isRetired };
    },
    [checkAccountSupport, inputKey, isDismissedRef, readContextKey],
  );
  return { checkBeforeSubmit, retireAttempts };
}

interface LiteSubmitGateOptions {
  orderForm: OrderFormState;
  payTokenIdentity: string;
  hasCustomTokenSelected: boolean;
  orderProviderId?: PerpsProviderType;
  isDismissedRef: { readonly current: boolean };
}

export function usePerpsLiteOrderSubmitGate({
  orderForm,
  payTokenIdentity,
  hasCustomTokenSelected,
  orderProviderId: providerId,
  isDismissedRef,
}: LiteSubmitGateOptions) {
  const support = usePerpsAccountSupport(
    PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
    providerId,
  );
  const gate = usePerpsOrderSubmitGate(
    support.checkAccountSupport,
    JSON.stringify([
      providerId,
      orderForm,
      payTokenIdentity,
      hasCustomTokenSelected,
    ]),
    { isDismissedRef, readContextKey: support.readContextKey },
  );
  return {
    ...gate,
    unsupportedContentKey: support.unsupportedContentKey,
    closeAccountUnsupportedModal: support.closeAccountUnsupportedModal,
  };
}
