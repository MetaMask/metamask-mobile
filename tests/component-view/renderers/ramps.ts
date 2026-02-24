import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import BuildQuote from '../../../app/components/UI/Ramp/Views/BuildQuote';
import {
  initialStateRamps,
  type InitialStateRampsOptions,
} from '../presets/ramps';

interface RenderBuildQuoteViewOptions {
  overrides?: DeepPartial<RootState>;
  rampsOptions?: InitialStateRampsOptions;
}

/**
 * Renders the ramps v2 BuildQuote screen with a sensible default Ramps preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderBuildQuoteView(
  options: RenderBuildQuoteViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, rampsOptions } = options;

  const builder = initialStateRamps(rampsOptions);
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    BuildQuote as unknown as React.ComponentType,
    { name: Routes.RAMP.AMOUNT_INPUT },
    { state },
  );
}
