import { TokenRatesControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';
import { Hex } from '@metamask/utils';
import { createDeepEqualSelector } from './util';

const selectTokenRatesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenRatesController;

export const selectContractExchangeRates = createDeepEqualSelector(
  selectEvmChainId,
  selectTokenRatesControllerState,
  (chainId: Hex, tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData[chainId],
);

export const selectContractExchangeRatesByChainId = createDeepEqualSelector(
  selectTokenRatesControllerState,
  (_state: RootState, chainId: Hex) => chainId,
  (tokenRatesControllerState: TokenRatesControllerState, chainId: Hex) =>
    tokenRatesControllerState.marketData[chainId],
);

export const selectTokenMarketData = createDeepEqualSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData,
);

export const selectTokenMarketDataByChainId = createDeepEqualSelector(
  [selectTokenMarketData, (_state: RootState, chainId: Hex) => chainId],
  (marketData, chainId) => marketData?.[chainId] || {},
);
