import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { providerSupportsAsset } from '../utils/providerSupportsAsset';
import { useRampsController } from './useRampsController';
import { createTokenNotAvailableModalNavigationDetails } from '../Views/Modals/TokenNotAvailableModal';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';

const NO_SUPPORTING_PROVIDER_DELAY_MS = 600;

export interface UseEnsureProviderForAssetParams {
  /**
   * CAIP asset id of the token the caller wants funded.
   * When `undefined` the hook is a no-op (callers may still pass `enabled: true`
   * while their own bootstrap settles).
   */
  assetId: string | undefined;
  /**
   * Gates the entire hook. Callers should set this to `true` only while the
   * surface invoking the hook is mounted/focused — equivalent to BuildQuote's
   * `useIsFocused()` check.
   */
  enabled: boolean;
  /**
   * Caller-derived signal that the currently selected provider cannot fulfill
   * `assetId`. Typically derived from `providerSupportsAsset(...)` plus
   * the provider's settled payment-methods state. When `true` and no other
   * provider supports the asset, `onNoSupportingProvider` fires.
   */
  isTokenUnavailable: boolean;
  /**
   * Optional callback invoked (debounced) when no available provider supports
   * `assetId`. When omitted, the hook navigates to the Ramp
   * `TokenNotAvailableModal` — this preserves the existing BuildQuote behavior.
   * Surfaces outside the Ramp navigator (e.g. MM Pay) should pass a callback
   * that handles the unavailable state in their own UX (banner, disabled CTA,
   * etc.) rather than relying on the default.
   */
  onNoSupportingProvider?: (assetId: string) => void;
  /**
   * Forwarded to the default `TokenNotAvailableModal` callback. Ignored when
   * `onNoSupportingProvider` is provided. Mirrors BuildQuote's existing
   * `buyFlowOrigin` route param.
   */
  buyFlowOrigin?: BuyFlowOrigin;
  /**
   * Optional value the caller can bump (e.g. on screen focus) to force the
   * "no supporting provider" notification to re-fire after the dedup ref was
   * cleared. BuildQuote bumps this in `useFocusEffect`.
   */
  refreshKey?: number;
}

/**
 * Token-aware provider auto-select for any Ramp-consuming surface.
 *
 * Behavior, mirroring the previous in-place BuildQuote effects:
 *
 * - If no provider is selected and at least one provider supports `assetId`,
 * select that provider (marked `autoSelected: true`).
 * - If the currently selected provider does not support `assetId`
 * (`isTokenUnavailable === true`) but another provider does, silently switch
 * to that provider.
 * - If no provider supports `assetId` and `isTokenUnavailable === true`,
 * invoke `onNoSupportingProvider(assetId)` after a short debounce. The same
 * `(providerId, assetId)` pair is only signalled once per `refreshKey` value
 * to avoid duplicate prompts during a single visit.
 *
 * When `enabled` is `false` the hook is inert and resets its dedup state so
 * the next focused render can re-fire the unavailable signal.
 */
export function useEnsureProviderForAsset({
  assetId,
  enabled,
  isTokenUnavailable,
  onNoSupportingProvider,
  buyFlowOrigin,
  refreshKey,
}: UseEnsureProviderForAssetParams): void {
  const navigation = useNavigation();
  const { providers, selectedProvider, setSelectedProvider } =
    useRampsController();

  // Tracks which provider:asset combination has already triggered the
  // "no supporting provider" callback during the current focus session so we
  // don't fire it repeatedly while the effect re-runs.
  const lastShownUnavailableKeyRef = useRef<string>('');

  const defaultOnNoSupportingProvider = useCallback(
    (id: string) => {
      navigation.navigate(
        ...createTokenNotAvailableModalNavigationDetails({
          assetId: id,
          buyFlowOrigin,
        }),
      );
    },
    [navigation, buyFlowOrigin],
  );

  const notifyNoSupportingProvider =
    onNoSupportingProvider ?? defaultOnNoSupportingProvider;

  // Effect 1: when no provider is selected, pick the first one that supports
  // the asset. Mirrors BuildQuote.tsx prior behavior verbatim.
  useEffect(() => {
    if (!enabled || selectedProvider || !assetId || providers.length === 0) {
      return;
    }
    const supportingProvider = providers.find((p) =>
      providerSupportsAsset(p, assetId),
    );
    if (supportingProvider) {
      setSelectedProvider(supportingProvider, { autoSelected: true });
    }
  }, [enabled, selectedProvider, assetId, providers, setSelectedProvider]);

  // Effect 2: when the selected token is unavailable for the current
  // provider, silently switch to any other provider that supports the token.
  // Only fall through to `notifyNoSupportingProvider` when no provider does.
  useEffect(() => {
    if (!enabled || !isTokenUnavailable) {
      lastShownUnavailableKeyRef.current = '';
      return;
    }

    if (assetId) {
      const supportingProvider = providers.find(
        (p) =>
          p.id !== selectedProvider?.id && providerSupportsAsset(p, assetId),
      );
      if (supportingProvider) {
        setSelectedProvider(supportingProvider, { autoSelected: true });
        return;
      }
    }

    const key = `${selectedProvider?.id}:${assetId}`;
    if (lastShownUnavailableKeyRef.current === key) return;

    const timer = setTimeout(() => {
      lastShownUnavailableKeyRef.current = key;
      notifyNoSupportingProvider(assetId ?? '');
    }, NO_SUPPORTING_PROVIDER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    enabled,
    isTokenUnavailable,
    assetId,
    selectedProvider?.id,
    refreshKey,
    providers,
    setSelectedProvider,
    notifyNoSupportingProvider,
  ]);
}
