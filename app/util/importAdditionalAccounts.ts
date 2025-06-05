import Engine from '../core/Engine';
import { BNToHex } from '../util/number';
import Logger from '../util/Logger';
import ExtendedKeyringTypes from '../../app/constants/keyringTypes';
import type EthQuery from '@metamask/eth-query';
import type { BN } from 'ethereumjs-util';
import { Hex } from '@metamask/utils';
import { getGlobalEthQuery } from './networks/global-network';
import { setIsAccountSyncingReadyToBeDispatched } from '../actions/identity';

const ZERO_BALANCE = '0x0';
const MAX = 20;

/**
 * Get an account balance from the network.
 * @param address - The account address
 * @param ethQuery - The EthQuery instance to use when asking the network
 */
const getBalance = async (address: string, ethQuery: EthQuery): Promise<Hex> =>
  new Promise((resolve, reject) => {
    ethQuery.getBalance(address, (error: Error, balance: BN) => {
      if (error) {
        reject(error);
        Logger.error(error);
      } else {
        const balanceHex = BNToHex(balance);
        Logger.log(`💰 BALANCE CHECK: ${address} = ${balanceHex}`);
        resolve(balanceHex || ZERO_BALANCE);
      }
    });
  });

/**
 * Add additional accounts in the wallet based on balance
 */
export default async () => {
  try {
    Logger.log('🔍 STARTING importAdditionalAccounts');
    const { KeyringController } = Engine.context;
    const ethQuery = getGlobalEthQuery();

    await KeyringController.withKeyring(
      { type: ExtendedKeyringTypes.hd, index: 0 },
      async ({ keyring }) => {
        for (let i = 0; i < MAX; i++) {
          const [newAccount] = await keyring.addAccounts(1);
          Logger.log(`🆕 CREATED ACCOUNT ${i}: ${newAccount}`);

          let newAccountBalance = ZERO_BALANCE;
          try {
            newAccountBalance = await getBalance(newAccount, ethQuery);
          } catch (error) {
            Logger.log(`❌ BALANCE ERROR for ${newAccount}:`, error);
            // Errors are gracefully handled so that `withKeyring`
            // will not rollback the primary keyring, and accounts
            // created in previous loop iterations will remain in place.
          }

          if (newAccountBalance === ZERO_BALANCE) {
            // remove extra zero balance account we just added and break the loop
            Logger.log(`🗑️ REMOVING ZERO BALANCE ACCOUNT: ${newAccount}`);
            keyring.removeAccount?.(newAccount);
            break;
          } else {
            Logger.log(
              `✅ KEEPING ACCOUNT WITH BALANCE: ${newAccount} (${newAccountBalance})`,
            );
          }
        }
      },
    );
    Logger.log('✅ COMPLETED importAdditionalAccounts');
  } finally {
    // We don't want to catch errors here, we let them bubble up to the caller
    // as we want to set `isAccountSyncingReadyToBeDispatched` to true either way
    await setIsAccountSyncingReadyToBeDispatched(true);
  }
};
