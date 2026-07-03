import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import ActivityScreen from '../../../app/components/Views/ActivityScreen/ActivityScreen';
import ActivityList from '../../../app/components/Views/ActivityList';
import ActivityView from '../../../app/components/Views/ActivityView';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import {
  initialStateActivity,
  initialStateActivityWithRedesignEnabled,
} from '../presets/activity';

interface RenderActivityScreenViewOptions {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
  params?: Record<string, unknown>;
}

interface RenderActivityScreenViewWithRoutesOptions
  extends RenderActivityScreenViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

interface RenderActivityListViewOptions {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
}

interface RenderActivityListViewWithRoutesOptions
  extends RenderActivityListViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

interface RenderActivityViewOptions {
  overrides?: DeepPartial<RootState>;
  redesignEnabled?: boolean;
}

interface RenderActivityViewWithRoutesOptions
  extends RenderActivityViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

function ActivityViewWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityView as unknown as React.ComponentType),
  );
}

function ActivityScreenWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityScreen),
  );
}

function ActivityListWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityList),
  );
}

function buildActivityState(options: {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
  redesignEnabled?: boolean;
}) {
  if (options.state) {
    return options.state;
  }

  const builder = options.redesignEnabled
    ? initialStateActivityWithRedesignEnabled()
    : initialStateActivity();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return builder.build();
}

export function renderActivityScreenView(
  options: RenderActivityScreenViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const state = buildActivityState(options);

  return renderComponentViewScreen(
    ActivityScreenWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    { state },
    options.params,
  );
}

export function renderActivityScreenViewWithRoutes(
  options: RenderActivityScreenViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const state = buildActivityState(options);

  return renderScreenWithRoutes(
    ActivityScreenWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    options.extraRoutes,
    { state },
  );
}

export function renderActivityListView(
  options: RenderActivityListViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const state = buildActivityState(options);

  return renderComponentViewScreen(
    ActivityListWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    { state },
  );
}

export function renderActivityListViewWithRoutes(
  options: RenderActivityListViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const state = buildActivityState(options);

  return renderScreenWithRoutes(
    ActivityListWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    options.extraRoutes,
    { state },
  );
}

export function renderActivityView(
  options: RenderActivityViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const state = buildActivityState({
    overrides: options.overrides,
    redesignEnabled: options.redesignEnabled,
  });

  return renderComponentViewScreen(
    ActivityViewWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    { state },
  );
}

export function renderActivityViewWithRoutes(
  options: RenderActivityViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const state = buildActivityState({
    overrides: options.overrides,
    redesignEnabled: options.redesignEnabled,
  });

  return renderScreenWithRoutes(
    ActivityViewWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    options.extraRoutes,
    { state },
  );
}
