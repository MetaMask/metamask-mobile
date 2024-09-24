import Engine from '../core/Engine';
import { BNToHex } from '../util/number';
import Logger from '../util/Logger';
import ExtendedKeyringTypes from '../../app/constants/keyringTypes';

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
  const { KeyringController } = Engine.context;
  const ethQuery = Engine.getGlobalEthQuery();

  await KeyringController.withKeyring(
    { type: ExtendedKeyringTypes.hd },
    async (primaryKeyring) => {
      const existingAccounts = await primaryKeyring.getAccounts();
      let lastBalance = await getBalance(
        existingAccounts[existingAccounts.length - 1],
        ethQuery,
      );
      let i = 0;
      // seek out the first zero balance
      while (lastBalance !== ZERO_BALANCE && i < MAX) {
        lastBalance = await getBalance(
          await primaryKeyring.addAccounts(1),
          ethQuery,
        );
        i++;
      }

      // remove extra zero balance account potentially created from seeking ahead
      const currentAccounts = await primaryKeyring.getAccounts();
      if (currentAccounts.length > 1 && lastBalance === ZERO_BALANCE) {
        primaryKeyring.removeAccount(
          currentAccounts[currentAccounts.length - 1],
        );
      }
    },
  );
};
