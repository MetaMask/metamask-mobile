import { ETHERSCAN_SUPPORTED_CHAIN_IDS } from '@metamask/preferences-controller';

const OLD_SUPPORTED_CHAIN_IDS = { ...ETHERSCAN_SUPPORTED_CHAIN_IDS };

// Remove 0x3e7 from the list of supported chain ids since it was not in the map at the time of migration
delete OLD_SUPPORTED_CHAIN_IDS['0x3e7'];

export default function migrate(state) {
  try {
    Object.values(ETHERSCAN_SUPPORTED_CHAIN_IDS).forEach((hexChainId) => {
      const thirdPartyApiMode = state?.privacy?.thirdPartyApiMode ?? true;
      if (
        state?.engine?.backgroundState?.PreferencesController
          ?.showIncomingTransactions
      ) {
        state.engine.backgroundState.PreferencesController.showIncomingTransactions =
          {
            ...state.engine.backgroundState.PreferencesController
              .showIncomingTransactions,
            [hexChainId]: thirdPartyApiMode,
          };
      } else if (state?.engine?.backgroundState?.PreferencesController) {
        state.engine.backgroundState.PreferencesController.showIncomingTransactions =
          { [hexChainId]: thirdPartyApiMode };
      }
    });

    if (state?.privacy?.thirdPartyApiMode !== undefined) {
      delete state.privacy.thirdPartyApiMode;
    }

    return state;
  } catch (e) {
    return state;
  }
}
