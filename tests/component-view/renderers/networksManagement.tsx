import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderScreenWithRoutes } from '../render';
import NetworksManagementView from '../../../app/components/Views/NetworksManagement/NetworksManagementView';
import NetworkDetailsView from '../../../app/components/Views/NetworksManagement/NetworkDetailsView/NetworkDetailsView';
import { initialStateNetworksManagement } from '../presets/networksManagement';

interface NetworksManagementRendererOptions {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
}

function buildNetworksManagementState(
  options: NetworksManagementRendererOptions = {},
) {
  if (options.state) {
    return options.state;
  }

  const builder = initialStateNetworksManagement();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }
  return builder.build();
}

export function renderNetworksManagementView(
  options: NetworksManagementRendererOptions = {},
) {
  return renderScreenWithRoutes(
    NetworksManagementView as unknown as React.ComponentType,
    { name: Routes.SETTINGS.NETWORKS_MANAGEMENT },
    [
      {
        name: Routes.SETTINGS.NETWORK_DETAILS,
        Component: NetworkDetailsView as unknown as React.ComponentType,
      },
    ],
    { state: buildNetworksManagementState(options) },
  );
}

export function renderNetworkDetailsView(
  options: NetworksManagementRendererOptions & {
    initialParams?: Record<string, unknown>;
  } = {},
) {
  return renderScreenWithRoutes(
    NetworkDetailsView as unknown as React.ComponentType,
    { name: Routes.SETTINGS.NETWORK_DETAILS },
    [
      {
        name: Routes.SETTINGS.NETWORKS_MANAGEMENT,
        Component: NetworksManagementView as unknown as React.ComponentType,
      },
    ],
    { state: buildNetworksManagementState(options) },
    options.initialParams,
  );
}
