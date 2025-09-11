import { selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

export const selectAssetsBySelectedAccountGroup = createDeepEqualSelector(
  (state: RootState) => {
    const {
      AccountTreeController,
      AccountsController,
      TokensController,
      TokenBalancesController,
      TokenRatesController,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainAssetsController,
      MultichainBalancesController,
      MultichainAssetsRatesController,
      ///: END:ONLY_INCLUDE_IF
      CurrencyRateController,
      NetworkController,
      AccountTrackerController,
    } = state.engine.backgroundState;

    let multichainState = {
      accountsAssets: {},
      assetsMetadata: {},
      balances: {},
      conversionRates: {},
    };

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    multichainState = {
      ...MultichainAssetsController,
      ...MultichainBalancesController,
      ...MultichainAssetsRatesController,
    };
    ///: END:ONLY_INCLUDE_IF

    return {
      ...AccountTreeController,
      ...AccountsController,
      ...TokensController,
      ...TokenBalancesController,
      ...TokenRatesController,
      ...multichainState,
      ...CurrencyRateController,
      ...NetworkController,
      ...(AccountTrackerController as {
        accountsByChainId: Record<
          Hex,
          Record<
            Hex,
            {
              balance: Hex | null;
            }
          >
        >;
      }),
    };
  },
  (filteredState) => _selectAssetsBySelectedAccountGroup(filteredState),
);
