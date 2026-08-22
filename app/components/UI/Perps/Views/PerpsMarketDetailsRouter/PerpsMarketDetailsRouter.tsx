import React, { useLayoutEffect, useRef } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import PerpsMarketDetailsView from '../PerpsMarketDetailsView';
import PerpsProMarketView from '../PerpsProMarketView';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';
import type { PerpsStackParamList } from '../../types/navigation';

const SAFE_AREA_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

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
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const symbol = route.params?.market?.symbol;
  const mode = isProModeEnabled ? 'pro' : 'lite';
  const previousIdentityRef = useRef<
    { symbol?: string; mode: string } | undefined
  >(undefined);
  const consumedExplicitTriggerRef = useRef(false);
  const previousIdentity = previousIdentityRef.current;
  const generationTrigger =
    (!consumedExplicitTriggerRef.current
      ? route.params?.detailGenerationTrigger
      : undefined) ??
    (previousIdentity?.symbol && previousIdentity.symbol !== symbol
      ? 'market_switch'
      : previousIdentity?.mode && previousIdentity.mode !== mode
        ? 'mode_switch'
        : 'initial');

  useLayoutEffect(() => {
    previousIdentityRef.current = { symbol, mode };
    consumedExplicitTriggerRef.current = true;
  }, [mode, symbol]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')} edges={SAFE_AREA_EDGES}>
      {isProModeEnabled ? (
        <PerpsProMarketView generationTrigger={generationTrigger} />
      ) : (
        <PerpsMarketDetailsView generationTrigger={generationTrigger} />
      )}
    </SafeAreaView>
  );
};

export default PerpsMarketDetailsRouter;
