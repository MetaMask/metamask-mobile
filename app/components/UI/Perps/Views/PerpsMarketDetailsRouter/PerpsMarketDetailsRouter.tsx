import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  useNavigation,
  useIsFocused,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import PerpsMarketDetailsView from '../PerpsMarketDetailsView';
import PerpsProMarketView from '../PerpsProMarketView';
import PerpsOutreachBanner from '../../components/PerpsOutreachBanner';
import { usePerpsOutreachCampaign } from '../../hooks/usePerpsOutreachCampaign';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';
import type { PerpsStackParamList } from '../../types/navigation';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import PerpsLoader from '../../components/PerpsLoader';
import PerpsConnectionErrorView from '../../components/PerpsConnectionErrorView';

const SAFE_AREA_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];
// The outreach banner sits above the market header and paints its background up
// to the top edge of the screen, so it applies the top inset itself and the
// container must not apply it a second time.
const SAFE_AREA_EDGES_UNDER_BANNER: Edge[] = ['bottom', 'left', 'right'];

function resolveGenerationTrigger(
  explicitTrigger: 'market_switch' | undefined,
  previousIdentity: { symbol?: string; mode: string } | undefined,
  symbol: string | undefined,
  mode: string,
): 'initial' | 'market_switch' | 'mode_switch' {
  if (explicitTrigger) return explicitTrigger;
  if (previousIdentity?.symbol && previousIdentity.symbol !== symbol) {
    return 'market_switch';
  }
  if (previousIdentity?.mode && previousIdentity.mode !== mode) {
    return 'mode_switch';
  }
  return 'initial';
}

/**
 * Route component registered for `Routes.PERPS.MARKET_DETAILS`.
 *
 * Renders the Pro-mode market layout (`PerpsProMarketView`) when Pro mode is
 * enabled, otherwise the lite `PerpsMarketDetailsView`. The route name and
 * navigation params are identical for both modes; only the rendered component
 * differs, so market-list navigation is unaffected.
 *
 * The safe-area container lives here rather than in each layout: `SafeAreaView`
 * applies its insets through a native layout pass that lands a frame or more
 * after mount, so remounting it on every mode switch let the header sit under
 * the status bar until that pass ran — visibly long while the incoming layout
 * was still mounting. Keeping one container mounted across the swap keeps the
 * insets already applied.
 */
const PerpsMarketDetailsRouter: React.FC = () => {
  const tw = useTailwind();
  const isProModeEnabled = usePerpsProModeEnabled();
  const isFocused = useIsFocused();
  const { activeProvider, switchProvider } = usePerpsProvider();
  const { campaign: outreachCampaign } = usePerpsOutreachCampaign();
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const navigation =
    useNavigation<NavigationProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const symbol = route.params?.market?.symbol;
  const providerId = route.params?.market?.providerId;
  const requiresVenueSwitch =
    isProModeEnabled &&
    providerId !== undefined &&
    activeProvider !== providerId;
  const [venueSwitch, setVenueSwitch] = useState<
    'idle' | 'pending' | 'ready' | 'failed'
  >('idle');
  const isVenueReady =
    !isProModeEnabled ||
    (!requiresVenueSwitch &&
      venueSwitch !== 'pending' &&
      venueSwitch !== 'failed');
  const requestedProviderRef = useRef<typeof providerId>(undefined);
  const selectVenue = useCallback(() => {
    if (!providerId) return;
    requestedProviderRef.current = providerId;
    setVenueSwitch('pending');
    switchProvider(providerId).then(
      (result) => setVenueSwitch(result.success ? 'ready' : 'failed'),
      () => setVenueSwitch('failed'),
    );
  }, [providerId, switchProvider]);
  useEffect(() => {
    if (
      (!isProModeEnabled && venueSwitch === 'failed') ||
      (venueSwitch === 'ready' && !requiresVenueSwitch) ||
      ((venueSwitch === 'ready' || venueSwitch === 'failed') &&
        requestedProviderRef.current !== providerId)
    ) {
      setVenueSwitch('idle');
    } else if (requiresVenueSwitch && isFocused && venueSwitch === 'idle') {
      selectVenue();
    }
  }, [
    isFocused,
    isProModeEnabled,
    providerId,
    requiresVenueSwitch,
    selectVenue,
    venueSwitch,
  ]);
  const mode = isProModeEnabled ? 'pro' : 'lite';
  const previousIdentityRef = useRef<
    { symbol?: string; mode: string } | undefined
  >(undefined);
  const consumedExplicitTriggerRef = useRef(false);
  const previousIdentity = previousIdentityRef.current;
  const explicitGenerationTrigger = !consumedExplicitTriggerRef.current
    ? route.params?.detailGenerationTrigger
    : undefined;
  const generationTrigger = resolveGenerationTrigger(
    explicitGenerationTrigger,
    previousIdentity,
    symbol,
    mode,
  );

  useLayoutEffect(() => {
    if (!isVenueReady) return;
    previousIdentityRef.current = { symbol, mode };
    consumedExplicitTriggerRef.current = true;
    if (explicitGenerationTrigger) {
      navigation.setParams({ detailGenerationTrigger: undefined });
    }
  }, [explicitGenerationTrigger, isVenueReady, mode, navigation, symbol]);

  return (
    <>
      <PerpsOutreachBanner includesTopInset location="perp_market_details" />
      <SafeAreaView
        style={tw.style('flex-1 bg-default')}
        edges={
          outreachCampaign ? SAFE_AREA_EDGES_UNDER_BANNER : SAFE_AREA_EDGES
        }
      >
        {isProModeEnabled && venueSwitch === 'failed' ? (
          <PerpsConnectionErrorView
            error="Unable to select the market's trading provider"
            onRetry={selectVenue}
            showBackButton
          />
        ) : !isVenueReady ? (
          <PerpsLoader />
        ) : isProModeEnabled ? (
          <PerpsProMarketView generationTrigger={generationTrigger} />
        ) : (
          <PerpsMarketDetailsView generationTrigger={generationTrigger} />
        )}
      </SafeAreaView>
    </>
  );
};

export default PerpsMarketDetailsRouter;
