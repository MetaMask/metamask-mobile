/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { TokenRatesState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectChainId } from './networkController';

const selectTokenRatesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenRatesController;

export const selectContractExchangeRates = createSelector(
  selectTokenRatesControllerState,
  selectChainId,
  (tokenRatesControllerState: TokenRatesState, chainId: `0x${string}`) => {
    const contractMarketData =
      tokenRatesControllerState?.marketData?.[chainId] ?? {};

    return Object.entries(contractMarketData).reduce(
      (
        acc: { [address: string]: number | undefined },
        [address, marketData],
      ) => {
        acc[address] = marketData?.value;
        return acc;
      },
      {},
    );
  },
);

export const selectDataMarket = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesState) =>
    tokenRatesControllerState.marketData,
);
