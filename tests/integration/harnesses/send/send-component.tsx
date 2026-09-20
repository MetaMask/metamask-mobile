import type { AccountGroupAssets } from '@metamask/assets-controllers';
import React from 'react';

/*
 * REAL: useAccountTokens, Redux preference selection, TokenList, and token rows.
 * MOCKED: wallet/rate I/O and send app-shell navigation, context, and metrics.
 */
let mockAssets: AccountGroupAssets = {};
let mockFiatRate = 0;

jest.mock('../../../../app/selectors/assets/assets-list', () => ({
  ...jest.requireActual('../../../../app/selectors/assets/assets-list'),
  selectAssetsBySelectedAccountGroup: () => mockAssets,
  selectAssetsByAccountGroupId: () => ({}),
}));

jest.mock(
  '../../../../app/components/Views/confirmations/hooks/transactions/useTransactionAccountOverride',
  () => ({
    useTransactionAccountOverride: () => undefined,
  }),
);

jest.mock(
  '../../../../app/components/Views/confirmations/hooks/send/useAccountOverrideGroupId',
  () => ({
    useAccountOverrideGroupId: () => undefined,
  }),
);

jest.mock(
  '../../../../app/components/Views/confirmations/hooks/send/useEnsureAccountGroupAssets',
  () => ({
    useEnsureAccountGroupAssets: () => false,
  }),
);

jest.mock(
  '../../../../app/components/Views/confirmations/hooks/tokens/useTokenFiatRates',
  () => ({
    useTokenFiatRates: (requests: unknown[]) =>
      requests.map(() => mockFiatRate),
  }),
);

jest.mock(
  '../../../../app/components/hooks/useTokensData/useTokensData',
  () => ({
    useTokensData: () => ({}),
  }),
);

jest.mock(
  '../../../../app/components/Views/confirmations/hooks/send/useSendScreenNavigation',
  () => ({
    useSendScreenNavigation: () => ({
      gotToSendScreen: jest.fn(),
    }),
  }),
);

jest.mock(
  '../../../../app/components/Views/confirmations/context/send-context',
  () => ({
    useSendContext: () => ({
      asset: undefined,
      updateAsset: jest.fn(),
      updateTo: jest.fn(),
    }),
  }),
);

jest.mock(
  '../../../../app/components/Views/confirmations/hooks/send/metrics/useAssetSelectionMetrics',
  () => ({
    useAssetSelectionMetrics: () => ({
      captureAssetSelected: jest.fn(),
    }),
  }),
);

import { TokenList } from '../../../../app/components/Views/confirmations/components/token-list/token-list';
import { useAccountTokens } from '../../../../app/components/Views/confirmations/hooks/send/useAccountTokens';
import type { RootState } from '../../../../app/reducers';
import initialRootState from '../../../../app/util/test/initial-root-state';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../app/util/test/renderWithProvider';

interface SendAssetDropdownOptions {
  assets: AccountGroupAssets;
  fiatRate: number;
  showFiatOnTestnets: boolean;
}

function SendAssetDropdown() {
  const tokens = useAccountTokens();
  return <TokenList tokens={tokens} />;
}

export function renderSendAssetDropdown({
  assets,
  fiatRate,
  showFiatOnTestnets,
}: SendAssetDropdownOptions) {
  mockAssets = assets;
  mockFiatRate = fiatRate;

  const state: DeepPartial<RootState> = {
    ...initialRootState,
    settings: {
      showFiatOnTestnets,
    },
  };

  return renderWithProvider(<SendAssetDropdown />, { state });
}
