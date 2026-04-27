import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import { QuoteSelectorView } from '../../../app/components/UI/Bridge/components/QuoteSelectorView';
import { initialStateBridge } from '../presets/bridge';

interface RenderQuoteSelectorViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

/**
 * Renders QuoteSelectorView with a sensible default Bridge preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderQuoteSelectorView(
  options: RenderQuoteSelectorViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    QuoteSelectorView as unknown as React.ComponentType,
    { name: Routes.BRIDGE.QUOTE_SELECTOR_VIEW },
    { state },
  );
}
