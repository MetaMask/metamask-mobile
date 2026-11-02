import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyActivityView from '../../../app/components/UI/Money/Views/MoneyActivityView/MoneyActivityView';
import { renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../app/selectors/featureFlagController/moneyAccount';

let restoreStore: (() => void) | undefined;

/** Puts back the `ReduxService.store` that was current before the last render. */
export function restoreVbaTransfersReduxServiceStore(): void {
  restoreStore?.();
}

const bindReduxServiceStore = (store: ReduxStore) => {
  restoreVbaTransfersReduxServiceStore();
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = store;
  restoreStore = () => {
    restoreStore = undefined;
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
};

const enabledFlag = { enabled: true, minimumVersion: '0.0.0' };

/**
 * Remote flags that turn on VBA rows in Money activity. Card enrichment stays
 * off so the only HTTP the screen needs is the Accounts API and the Money
 * Account API.
 */
const vbaActivityFlags = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          moneyVbaPendingActivityEnabled: enabledFlag,
          moneyVbaCompletedActivityEnabled: enabledFlag,
          moneyEnableActivityDetails: enabledFlag,
          moneyEnableCardActivityEnrichment: { ...enabledFlag, enabled: false },
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
            ...enabledFlag,
            regions: ['US'],
            regionCurrencies: { US: 'USD' },
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

/**
 * Renders Money activity (the deposit history) for the VBA test wallet in the
 * US (USD bank account), with VBA pending and completed activity enabled.
 *
 * @returns The render result.
 */
export const renderVbaTransfersActivity = () => {
  const state = initialStateVba({ location: 'US' })
    .withOverrides(vbaActivityFlags)
    .build();
  const result = renderScreenWithRoutes(
    MoneyActivityView as unknown as React.ComponentType,
    { name: Routes.MONEY.ACTIVITY },
    [],
    { state },
  );
  bindReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};
