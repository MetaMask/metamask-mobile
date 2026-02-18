import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';
import { renderComponentViewScreen } from '../render';
import AssetDetailsContainer from '../../../../components/Views/AssetDetails';
import { initialStateAssetDetails } from '../presets/assetDetails';

interface RenderAssetDetailsViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
  routeParams: {
    address: string;
    chainId: string;
    asset: Record<string, unknown>;
  };
}

/**
 * Renders AssetDetails view with a sensible default AssetDetails preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderAssetDetailsView(
  options: RenderAssetDetailsViewOptions,
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat, routeParams } = options;

  const builder = initialStateAssetDetails({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    AssetDetailsContainer as unknown as React.ComponentType,
    { name: 'AssetDetails' },
    { state },
    routeParams,
  );
}
