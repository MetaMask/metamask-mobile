import { KeyringTypes } from '@metamask/keyring-controller';
import { MPCKeyring, Custodian } from '@metamask/eth-mpc-keyring';
import EngineInstance from '../../Engine';

const getKeyringController = () => EngineInstance.context.KeyringController;

export const createMpcKeyring = async (verifierId: string) => {
  const keyringController = getKeyringController();
  const { id } = await keyringController.addNewKeyring(KeyringTypes.mpc);
  await keyringController.withKeyring({ id }, async ({ keyring }) => {
    await (keyring as MPCKeyring).setup({ verifierIds: [verifierId] });
  });

  return id;
};

export const createMpcJoinData = async (keyringId: string): Promise<string> => {
  const keyringController = getKeyringController();
  return await keyringController.withKeyring(
    { id: keyringId },
    async ({ keyring }) => (keyring as MPCKeyring).createJoinData(),
  );
};

export const addMpcCustodian = async (
  keyringId: string,
  joinData: string,
): Promise<void> => {
  const keyringController = getKeyringController();
  await keyringController.withKeyring(
    { id: keyringId },
    async ({ keyring }) => {
      await (keyring as MPCKeyring).addCustodian(joinData);
    },
  );
};

export const joinMpcWallet = async (
  verifierId: string,
  joinData: string,
): Promise<string> => {
  const keyringController = getKeyringController();
  const { id } = await keyringController.addNewKeyring(KeyringTypes.mpc);
  await keyringController.withKeyring({ id }, async ({ keyring }) => {
    await (keyring as MPCKeyring).setup({
      verifierIds: [verifierId],
      mode: 'join',
      joinData,
    });
  });
  return id;
};

export const getMpcCustodians = async (
  keyringId: string,
): Promise<Custodian[]> => {
  const keyringController = getKeyringController();
  return await keyringController.withKeyring(
    { id: keyringId },
    async ({ keyring }) => (keyring as MPCKeyring).getCustodians(),
  );
};

export const getMpcCustodianId = async (keyringId: string): Promise<string> => {
  const keyringController = getKeyringController();
  return await keyringController.withKeyring(
    { id: keyringId },
    async ({ keyring }) => (keyring as MPCKeyring).getCustodianId(),
  );
};

export default {
  createMpcKeyring,
  createMpcJoinData,
  addMpcCustodian,
  joinMpcWallet,
  getMpcCustodians,
  getMpcCustodianId,
};
