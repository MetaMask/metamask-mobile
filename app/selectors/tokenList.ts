import { createSelector } from 'reselect';
import { selectTokenSortConfig } from './preferencesController';
import { selectIsEvmNetworkSelected } from './multichainNetworkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectSelectedInternalAccount } from './accountsController';
///: END:ONLY_INCLUDE_IF

import {
  selectEvmTokens,
  selectEvmTokenFiatBalances,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectMultichainTokenListForAccountId,
  ///: END:ONLY_INCLUDE_IF
} from './multichain';
import { RootState } from '../reducers';
import { TokenI } from '../components/UI/Tokens/types';
import { sortAssets } from '../components/UI/Tokens/util';
import { TraceName, endTrace, trace } from '../util/trace';
import { getTraceTags } from '../util/sentry/tags';
import { store } from '../store';
import { createDeepEqualOutputSelector } from './util';

const _selectSortedTokenKeys = createSelector(
  [
    selectEvmTokens,
    selectEvmTokenFiatBalances,
    selectIsEvmNetworkSelected,
    selectTokenSortConfig,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    (state: RootState) => {
      const selectedAccount = selectSelectedInternalAccount(state);
      return selectMultichainTokenListForAccountId(state, selectedAccount?.id);
    },
    ///: END:ONLY_INCLUDE_IF
  ],
  (
    evmTokens,
    tokenFiatBalances,
    isEvmSelected,
    tokenSortConfig,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmTokens,
    ///: END:ONLY_INCLUDE_IF
  ) => {
    trace({
      name: TraceName.Tokens,
      tags: getTraceTags(store.getState()),
    });

    const tokenListData = isEvmSelected ? evmTokens : nonEvmTokens;

    const tokensWithBalances: TokenI[] = tokenListData.map((token, i) => ({
      ...token,
      tokenFiatAmount: isEvmSelected ? tokenFiatBalances[i] : token.balanceFiat,
    }));

    const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);

    endTrace({ name: TraceName.Tokens });

    return tokensSorted.map(({ address, chainId, isStaked }) => ({
      address,
      chainId,
      isStaked,
    }));
  },
);

// Deep equal OUTPUT selector ensures stable references when content is identical.
// This prevents re-renders in components even when prices change but token list stays the same.
// Uses both input AND output deep equality for optimal performance.
export const selectSortedTokenKeys = createDeepEqualOutputSelector(
  _selectSortedTokenKeys,
  (keys) => keys.filter(({ address, chainId }) => address && chainId),
);
