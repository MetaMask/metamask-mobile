import Engine from '../core/Engine';
import { BNToHex } from '../util/number';
import EthQuery from 'ethjs-query';
import Logger from '../util/Logger';
import ExtendedKeyringTypes from '../../app/constants/keyringTypes';

const HD_KEY_TREE_ERROR = 'MetamaskController - No HD Key Tree found';
const ZERO_BALANCE = '0x0';
const MAX = 20;

/**
 * Get an account balance from the network.
 * @param {string} address - The account address
 * @param {EthQuery} ethQuery - The EthQuery instance to use when asking the network
 */
const getBalance = async (address, ethQuery) =>
  new Promise((resolve, reject) => {
    ethQuery.getBalance(address, (error, balance) => {
      if (error) {
        reject(error);
        Logger.error(error);
      } else {
        const balanceHex = BNToHex(balance);
        resolve(balanceHex || ZERO_BALANCE);
      }
    });
  });

/**
 * Add additional accounts in the wallet based on balance
 */
export default async () => {
  const { KeyringController, NetworkController } = Engine.context;
  const { provider } = NetworkController.getProviderAndBlockTracker();

  const ethQuery = new EthQuery(provider);
  let accounts = await KeyringController.getAccounts();
  let lastBalance = await getBalance(accounts[accounts.length - 1], ethQuery);

  const { keyrings } = KeyringController.state;
  const filteredKeyrings = keyrings.filter(
    (keyring) => keyring.type === ExtendedKeyringTypes.hd,
  );
  const primaryKeyring = filteredKeyrings[0];
  if (!primaryKeyring) throw new Error(HD_KEY_TREE_ERROR);

  let i = 0;
  // seek out the first zero balance
  while (lastBalance !== ZERO_BALANCE) {
    if (i === MAX) break;
    await KeyringController.addNewAccountWithoutUpdate(primaryKeyring);
    accounts = await KeyringController.getAccounts();
    lastBalance = await getBalance(accounts[accounts.length - 1], ethQuery);
    i++;
  }

  // remove extra zero balance account potentially created from seeking ahead
  if (accounts.length > 1 && lastBalance === ZERO_BALANCE) {
    await KeyringController.removeAccount(accounts[accounts.length - 1]);
    accounts = await KeyringController.getAccounts();
  }
};
