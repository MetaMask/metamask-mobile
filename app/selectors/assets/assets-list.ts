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
      MultichainAssetsController,
      MultichainBalancesController,
      MultichainAssetsRatesController,
      CurrencyRateController,
      NetworkController,
      AccountTrackerController,
    } = state.engine.backgroundState;

    return {
      ...AccountTreeController,
      ...AccountsController,
      ...TokensController,
      ...TokenBalancesController,
      ...TokenRatesController,
      ...MultichainAssetsController,
      ...MultichainBalancesController,
      ...MultichainAssetsRatesController,
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
