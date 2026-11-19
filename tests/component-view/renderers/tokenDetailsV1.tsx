import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import { TokenDetails } from '../../../app/components/UI/TokenDetails/Views/TokenDetails';
import ContractSecurityScreen from '../../../app/components/UI/TokenDetails/components/V1/ContractSecurityScreen/ContractSecurityScreen';
import { AccessRestrictedProvider } from '../../../app/components/UI/Compliance';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import type {
  TokenDetailsRouteParams,
  TokenDetailsV1TabKey,
} from '../../../app/components/UI/TokenDetails/constants/constants';
import { buildTokenDetailsV1RouteParams } from '../api-mocking/tokenDetailsV1';
import { initialStateTokenDetailsV1 } from '../presets/tokenDetailsV1';

interface RenderTokenDetailsV1Options {
  overrides?: DeepPartial<RootState>;
  token?: TokenDetailsRouteParams;
  socialEnabled?: boolean;
  tabConfigOrder?: readonly TokenDetailsV1TabKey[];
}

function TokenDetailsEntry() {
  return (
    <AccessRestrictedProvider>
      <HardwareWalletProvider>
        <TokenDetails />
      </HardwareWalletProvider>
    </AccessRestrictedProvider>
  );
}

export function renderTokenDetailsV1View(
  options: RenderTokenDetailsV1Options = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, token, socialEnabled, tabConfigOrder } = options;
  const builder = initialStateTokenDetailsV1({
    deterministicFiat: true,
    socialEnabled,
    tabConfigOrder,
  });
  if (overrides) {
    builder.withOverrides(overrides);
  }

  return renderScreenWithRoutes(
    TokenDetailsEntry as unknown as React.ComponentType,
    { name: 'Asset' },
    [
      {
        name: Routes.CONTRACT_SECURITY,
        Component:
          ContractSecurityScreen as unknown as React.ComponentType<object>,
      },
    ],
    { state: builder.build() },
    (token ?? buildTokenDetailsV1RouteParams()) as unknown as Record<
      string,
      unknown
    >,
  );
}
