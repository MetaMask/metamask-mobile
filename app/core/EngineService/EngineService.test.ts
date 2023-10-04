import EngineService from './EngineService';
import Engine from '../Engine';
import { store } from '../../store';

jest.unmock('../Engine');

describe('EngineService', () => {
  EngineService.initalizeEngine(store);
  it('should have Engine initialized', () => {
    expect(Engine.context).toBeDefined();
  });
  it('should have recovered vault on redux store ', async () => {
    const { success } = await EngineService.initializeVaultFromBackup();
    expect(success).toBeTruthy();
    const { KeyringController } = store.getState().engine.backgroundState;
    expect(KeyringController.vault).toBeDefined();
  });
});
