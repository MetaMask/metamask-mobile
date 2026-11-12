import type { QueryClient } from '@tanstack/react-query';
import { installCollectiblesFixtureServices } from '../fixtures/collectibles-data-services';
import '../mocks';
import type React from 'react';
import Routes from '../../../app/constants/navigation/Routes';
import CollectiblesHome from '../../../app/components/UI/Collectibles/views/CollectiblesHome';
import type { RootState } from '../../../app/reducers';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import { renderScreenWithRoutes } from '../render';
import {
  initialStateCollectibles,
  type InitialStateCollectiblesOptions,
} from '../presets/collectibles';

interface RenderCollectiblesViewOptions
  extends InitialStateCollectiblesOptions {
  entry?: { Component: React.ComponentType; name: string };
  routes?: Parameters<typeof renderScreenWithRoutes>[2];
  params?: Record<string, unknown>;
  overrides?: DeepPartial<RootState>;
  queryClient?: QueryClient;
}

/**
 * Renders Collectibles with shared state and real navigation; destinations may
 * be route probes. Public openings come from the fixture's
 * polled `getRecentOpenings` read (`serveRecentOpenings`).
 */
export const renderCollectiblesView = ({
  entry = { Component: CollectiblesHome, name: Routes.COLLECTIBLES.HOME },
  routes = [],
  params,
  overrides,
  queryClient,
  ...stateOptions
}: RenderCollectiblesViewOptions = {}) => {
  const netInfo = jest.requireMock<{
    __setMockNetInfo?: (state: {
      type: string;
      isInternetReachable: boolean;
      details: null;
    }) => void;
  }>('@react-native-community/netinfo');
  netInfo.__setMockNetInfo?.({
    type: 'wifi',
    isInternetReachable: true,
    details: null,
  });
  installCollectiblesFixtureServices();
  const fixture = initialStateCollectibles(stateOptions);
  if (overrides) fixture.withOverrides(overrides);
  return renderScreenWithRoutes(
    entry.Component,
    { name: entry.name },
    routes,
    { state: fixture.build() },
    params,
    queryClient,
  );
};
