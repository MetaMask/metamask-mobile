import Accounts from '../helpers/Accounts';
import Ganache from '../../app/util/test/ganache';
import { SMART_CONTRACTS } from '../../app/util/test/smart-contracts';
import GanacheSeeder from '../../app/util/test/ganache-seeder';

const ganacheServer = new Ganache();
const validAccount = Accounts.getValidAccount();

export const startGanache = async () => {
  await ganacheServer.start({ mnemonic: validAccount.seedPhrase });
};

export const stopGanache = async () => {
  await ganacheServer.quit();
};

export const deployMultisig = async () => {
  const ganacheSeeder = await new GanacheSeeder(ganacheServer.getProvider());
  await ganacheSeeder.deploySmartContract(SMART_CONTRACTS.MULTISIG);
  const contractRegistry = ganacheSeeder.getContractRegistry();
  const multisigAddress = await contractRegistry.getContractAddress(
    SMART_CONTRACTS.MULTISIG,
  );
  return multisigAddress;
};

export const deployErc20 = async () => {
  const ganacheSeeder = await new GanacheSeeder(ganacheServer.getProvider());
  await ganacheSeeder.deploySmartContract(SMART_CONTRACTS.HST);
  const contractRegistry = ganacheSeeder.getContractRegistry();
  const erc20Address = await contractRegistry.getContractAddress(
    SMART_CONTRACTS.HST,
  );
  return erc20Address;
};

export const deployErc721 = async () => {
  const ganacheSeeder = await new GanacheSeeder(ganacheServer.getProvider());
  await ganacheSeeder.deploySmartContract(SMART_CONTRACTS.NFTS);
  const contractRegistry = ganacheSeeder.getContractRegistry();
  const erc721Address = await contractRegistry.getContractAddress(
    SMART_CONTRACTS.NFTS,
  );
  return erc721Address;
};