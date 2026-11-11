import '../mocks';
import React from 'react';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import Routes from '../../../app/constants/navigation/Routes';
import EarnInputView from '../../../app/components/UI/Earn/Views/EarnInputView/EarnInputView';
import { StakeSDKProvider } from '../../../app/components/UI/Stake/sdk/stakeSdkProvider';
import type { TokenI } from '../../../app/components/UI/Tokens/types';
import { renderScreenWithRoutes } from '../render';
import { initialStateEarn } from '../presets/earn';

const ETH_TOKEN: TokenI = {
  address: getNativeTokenAddress('0x1'),
  aggregators: [],
  balance: '1.5',
  balanceFiat: '$3000',
  chainId: '0x1',
  decimals: 18,
  image: '',
  logo: '',
  isETH: true,
  isNative: true,
  isStaked: false,
  name: 'Ethereum',
  symbol: 'Ethereum',
  ticker: 'ETH',
};

interface RenderEarnInputViewOptions {
  stablecoinLendingEnabled?: boolean;
  token?: TokenI;
}

/**
 * Renders EarnInputView the way staking routes do: inside StakeSDKProvider,
 * with route params and Redux-driven feature flags.
 */
export function renderEarnInputView(
  options: RenderEarnInputViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { stablecoinLendingEnabled = false, token = ETH_TOKEN } = options;
  const state = initialStateEarn({ stablecoinLendingEnabled }).build();

  const Screen = () => (
    <StakeSDKProvider>
      <EarnInputView />
    </StakeSDKProvider>
  );

  return renderScreenWithRoutes(
    Screen,
    { name: Routes.STAKING.STAKE },
    [],
    { state },
    { token },
  );
}
