import Engine from '../../core/Engine';

// eslint-disable-next-line import/prefer-default-export
export const generateStateLogs = (state: any): string => {
  const fullState = JSON.parse(JSON.stringify(state));

  delete fullState.engine.backgroundState.NftController;
  delete fullState.engine.backgroundState.TokensController;
  delete fullState.engine.backgroundState.TokenDetectionController;
  delete fullState.engine.backgroundState.NftDetectionController;
  delete fullState.engine.backgroundState.PhishingController;
  delete fullState.engine.backgroundState.AssetsContractController;

  // Remove encrypted vault from logs
  delete fullState.engine.backgroundState.KeyringController.vault;

  const { KeyringController } = Engine.context as any;
  const newState = {
    ...fullState,
    engine: {
      ...fullState.engine,
      backgroundState: {
        ...fullState.engine.backgroundState,
        KeyringController: {
          ...fullState.engine.backgroundState.KeyringController,
          keyrings: KeyringController.state.keyrings,
        },
      },
    },
  };

  return JSON.stringify(newState);
};
