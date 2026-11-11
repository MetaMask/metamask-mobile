import '../mocks';
import React, { useCallback, useRef } from 'react';
import { ScrollView, TextInput } from 'react-native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderScreenWithRoutes } from '../render';
import { initialStatePredict } from '../presets/predict';
import { initialStateActivity } from '../presets/activity';
import { initialStateTrending } from '../presets/trending';
import { deepMerge } from '../stateFixture';
import {
  PredictHomeSection,
  PredictRoot,
  usePredictEntryActions,
} from '../../../app/components/UI/PredictNext';
import UrlAutocomplete, {
  UrlAutocompleteCategory,
  type AutocompleteSearchResult,
  type UrlAutocompleteRef,
} from '../../../app/components/UI/UrlAutocomplete';
import ActivityList from '../../../app/components/Views/ActivityList';
import { ActivityTypeFilter } from '../../../app/components/Views/ActivityScreen/types';
import HomepageBalanceBreakdown from '../../../app/components/Views/Homepage/components/HomepageBalanceBreakdown';
import SportsTab from '../../../app/components/Views/TrendingView/tabs/SportsTab';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import { PerpsConnectionProvider } from '../../../app/components/UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../app/components/UI/Perps/providers/PerpsStreamManager';
import type { PredictConfig } from '../../../app/components/UI/PredictNext/config/predictConfig';
import type { PredictVenueControllerState } from '../../../app/components/UI/PredictNext/implementation/PredictVenueController';

/** Route of the screen that hosts every surface outside Predict. */
export const PREDICT_CROSS_SURFACE_ROUTE = 'PredictCrossSurfaceProbe';
export const PREDICT_CROSS_SURFACE_QUERY_INPUT =
  'predict-cross-surface-autocomplete-query';

const SPORTS_TAB_PROPS = {
  refresh: { trigger: 0, silentRefresh: false },
  refreshing: false,
  onRefresh: () => undefined,
};

/**
 * Every wallet surface that shows Predict data, as production mounts each
 * one, on a single screen: the Homepage Predictions section, the
 * BalanceBreakdown rows, Explore's Sports tab, Browser URL autocomplete and
 * the Predictions Activity list. All of them import only the PredictNext
 * entry point, so they share the one Active Venue in the store.
 */
const CrossSurfaceScreen = () => {
  const autocompleteRef = useRef<UrlAutocompleteRef>(null);
  const { openPredict } = usePredictEntryActions();

  const onChangeText = useCallback((text: string) => {
    autocompleteRef.current?.show();
    autocompleteRef.current?.search(text);
  }, []);

  // BrowserTab's `onSelect`: a Predictions result opens its intent.
  const onSelect = useCallback(
    (item: AutocompleteSearchResult) => {
      if (item.category === UrlAutocompleteCategory.Predictions) {
        openPredict(item.intent);
      }
    },
    [openPredict],
  );

  return (
    <HardwareWalletProvider>
      {/* Homepage's own wrapper: BalanceBreakdown's Perps slice reads it.
          Perps stays disabled, so no Perps connection starts. */}
      <PerpsConnectionProvider isEnabled={false} suppressErrorView>
        <PerpsStreamProvider>
          <ScrollView>
            <HomepageBalanceBreakdown />
            <PredictHomeSection sectionIndex={0} totalSectionsLoaded={1} />
            <SportsTab {...SPORTS_TAB_PROPS} />
            <TextInput
              testID={PREDICT_CROSS_SURFACE_QUERY_INPUT}
              onChangeText={onChangeText}
            />
            <UrlAutocomplete
              ref={autocompleteRef}
              onSelect={onSelect}
              onDismiss={() => undefined}
            />
            <ActivityList typeFilter={ActivityTypeFilter.Predictions} />
          </ScrollView>
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    </HardwareWalletProvider>
  );
};

export interface RenderPredictCrossSurfaceOptions {
  /** The whole `predictConfig` flag; a partial value parses as the default. */
  predictConfig: PredictConfig;
  venueState?: Partial<PredictVenueControllerState>;
}

/**
 * Renders every Predict surface outside Predict on one screen, with the real
 * root `Predict` route registered behind it (as `MainNavigator` does), so a
 * journey can switch Venue with the picker inside Predict, go back, and read
 * what every other surface shows under the new Venue. One store and one
 * data-service query client back them all, as in the app.
 */
export const renderPredictCrossSurface = ({
  predictConfig,
  venueState = {},
}: RenderPredictCrossSurfaceOptions) => {
  // Each surface's own preset, merged, so every surface starts from the
  // baseline its own view tests use.
  const state = [
    initialStateActivity().build(),
    initialStateTrending().build(),
    initialStatePredict()
      .withRemoteFeatureFlags({
        predictTradingEnabled: { enabled: true, minimumVersion: '0.0.0' },
        predictConfig,
      })
      .withOverrides({
        engine: {
          backgroundState: {
            PredictVenueController: {
              venueSelectionPreference: null,
              lastActiveVenue: null,
              sessionDefault: null,
              ...venueState,
            },
          },
        },
      } as DeepPartial<RootState>)
      .build(),
  ].reduce(
    (merged, next) => deepMerge(merged, next as Record<string, unknown>),
    {} as Record<string, unknown>,
  ) as DeepPartial<RootState>;

  return renderScreenWithRoutes(
    CrossSurfaceScreen,
    { name: PREDICT_CROSS_SURFACE_ROUTE },
    [{ name: Routes.PREDICT.ROOT, Component: PredictRoot }],
    { state },
  );
};
