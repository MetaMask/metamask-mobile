import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../../constants/navigation/Routes';
import BridgeView from '../../../../components/UI/Bridge/Views/BridgeView';
import { initialStateBridge } from '../presets/bridge';

interface RenderBridgeViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

/**
 * Renders BridgeView with a sensible default Bridge preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderBridgeView(
  options: RenderBridgeViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    BridgeView as unknown as React.ComponentType,
    { name: Routes.BRIDGE.BRIDGE_VIEW },
    { state },
  );
}
