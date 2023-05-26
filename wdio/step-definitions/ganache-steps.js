import { Given, Then } from '@wdio/cucumber-framework';
import Accounts from '../helpers/Accounts';
import Ganache from '../../app/util/test/ganache';
import { SMART_CONTRACTS } from '../../app/util/test/smart-contracts';
import GanacheSeeder from '../../app/util/test/ganache-seeder';

const ganacheServer = new Ganache();
const validAccount = Accounts.getValidAccount();

Given(/^Ganache server is started$/, async () => {
  await ganacheServer.start({ mnemonic: validAccount.seedPhrase });
});

Then(/^Ganache server is stopped$/, async () => {
  await ganacheServer.quit();
});

Given(/^Multisig contract is deployed$/, async function() {
  const ganacheSeeder = await new GanacheSeeder(ganacheServer.getProvider());
  await ganacheSeeder.deploySmartContract(SMART_CONTRACTS.MULTISIG);
  const contractRegistry = ganacheSeeder.getContractRegistry();
  this.multisig = await contractRegistry.getContractAddress(SMART_CONTRACTS.MULTISIG);
});

Given(/^ERC20 token contract is deployed$/, async function() {
  const ganacheSeeder = await new GanacheSeeder(ganacheServer.getProvider());
  await ganacheSeeder.deploySmartContract(SMART_CONTRACTS.HST);
  const contractRegistry = ganacheSeeder.getContractRegistry();
  this.erc20 = await contractRegistry.getContractAddress(SMART_CONTRACTS.HST);
});