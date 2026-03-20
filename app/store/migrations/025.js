// Hardcoded from ETHERSCAN_SUPPORTED_CHAIN_IDS at the time this migration was written.
const ETHERSCAN_SUPPORTED_CHAIN_IDS = {
  MAINNET: '0x1',
  GOERLI: '0x5',
  BSC: '0x38',
  BSC_TESTNET: '0x61',
  OPTIMISM: '0xa',
  OPTIMISM_SEPOLIA: '0xaa37dc',
  POLYGON: '0x89',
  POLYGON_TESTNET: '0x13881',
  AVALANCHE: '0xa86a',
  AVALANCHE_TESTNET: '0xa869',
  FANTOM: '0xfa',
  FANTOM_TESTNET: '0xfa2',
  SEPOLIA: '0xaa36a7',
  LINEA_GOERLI: '0xe704',
  LINEA_SEPOLIA: '0xe705',
  LINEA_MAINNET: '0xe708',
  MOONBEAM: '0x504',
  MOONBEAM_TESTNET: '0x507',
  MOONRIVER: '0x505',
  GNOSIS: '0x64',
  SEI: '0x531',
  MONAD: '0x8f',
};

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
