import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import WatchlistSection from '../../../app/components/Views/Homepage/Sections/Watchlist/WatchlistSection';
import WatchlistFullScreenView from '../../../app/components/UI/Assets/watchlist/Views/WatchlistFullScreenView/WatchlistFullScreenView';
import { TokenDetails } from '../../../app/components/UI/TokenDetails/Views/TokenDetails';
import { AccessRestrictedProvider } from '../../../app/components/UI/Compliance';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import { initialStateWatchlist } from '../presets/watchlist';
import WatchlistPerpsProvider from '../../../app/components/UI/Watchlist/WatchlistPerpsProvider';
import {
  createTestStreamManager,
  type PerpsStreamOverrides,
} from './perpsViewRenderer';

interface RenderWatchlistOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
  unifiedWatchlist?: boolean;
  perpsWatchlistSymbols?: string[];
  streamOverrides?: PerpsStreamOverrides;
}

function TokenDetailsWithProviders() {
  return (
    <AccessRestrictedProvider>
      <HardwareWalletProvider>
        <TokenDetails />
      </HardwareWalletProvider>
    </AccessRestrictedProvider>
  );
}

const ASSET_ROUTE = {
  name: 'Asset',
  Component:
    TokenDetailsWithProviders as unknown as React.ComponentType<object>,
};

const buildWatchlistState = (options: RenderWatchlistOptions = {}) => {
  const {
    overrides,
    deterministicFiat = true,
    unifiedWatchlist = false,
    perpsWatchlistSymbols,
  } = options;
  const builder = initialStateWatchlist({
    deterministicFiat,
    unifiedWatchlist,
    perpsWatchlistSymbols,
  });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

/**
 * Renders WatchlistSection with navigation to the full-screen watchlist and
 * Token Details (Asset) routes for cross-screen journey tests.
 */
export function renderWatchlistSectionWithRoutes(
  options: RenderWatchlistOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { streamManager } = createTestStreamManager(options.streamOverrides);
  const WatchlistSectionWithPerps = (
    props: React.ComponentProps<typeof WatchlistSection>,
  ) => (
    <WatchlistPerpsProvider testStreamManager={streamManager}>
      <WatchlistSection {...props} />
    </WatchlistPerpsProvider>
  );
  const WatchlistFullViewWithPerps = () => (
    <WatchlistFullScreenView testStreamManager={streamManager} />
  );

  return renderScreenWithRoutes(
    WatchlistSectionWithPerps as unknown as React.ComponentType,
    { name: 'WatchlistSection' },
    [
      {
        name: Routes.WALLET.WATCHLIST_FULL_VIEW,
        Component:
          WatchlistFullViewWithPerps as unknown as React.ComponentType<object>,
      },
      ASSET_ROUTE,
    ],
    { state: buildWatchlistState(options) },
    { sectionIndex: 3, totalSectionsLoaded: 5 },
  );
}

/**
 * Renders WatchlistFullScreenView with navigation to Token Details (Asset).
 */
export function renderWatchlistFullScreenViewWithRoutes(
  options: RenderWatchlistOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { streamManager } = createTestStreamManager(options.streamOverrides);
  const WatchlistFullViewWithPerps = () => (
    <WatchlistFullScreenView testStreamManager={streamManager} />
  );

  return renderScreenWithRoutes(
    WatchlistFullViewWithPerps as unknown as React.ComponentType,
    { name: Routes.WALLET.WATCHLIST_FULL_VIEW },
    [ASSET_ROUTE],
    { state: buildWatchlistState(options) },
  );
}

/** Alias for cross-screen watchlist journey tests starting on the homepage section. */
export const renderWatchlistJourneyWithRoutes =
  renderWatchlistSectionWithRoutes;
