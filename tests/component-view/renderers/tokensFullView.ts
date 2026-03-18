import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import TokensFullView from '../../../app/components/Views/TokensFullView';
import { initialStateWallet } from '../presets/wallet';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../../app/components/UI/Tokens/util/sortAssets';

interface RenderTokensFullViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

export function renderTokensFullView(
  options: RenderTokensFullViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;
  const builder = initialStateWallet({ deterministicFiat })
    .withPreferences({
      tokenSortConfig: DEFAULT_TOKEN_SORT_CONFIG,
    })
    .withOverrides({
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
              },
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>);

  if (overrides) {
    builder.withOverrides(overrides);
  }

  const state = builder.build();

  return renderComponentViewScreen(
    TokensFullView as unknown as React.ComponentType,
    { name: Routes.WALLET.TOKENS_FULL_VIEW },
    { state },
  );
}
