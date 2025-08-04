import Engine from '../core/Engine';
import { BNToHex } from '../util/number';
import Logger from '../util/Logger';
import ExtendedKeyringTypes from '../../app/constants/keyringTypes';
import type EthQuery from '@metamask/eth-query';
import type { BN } from 'ethereumjs-util';
import { Hex } from '@metamask/utils';
import { getGlobalEthQuery } from './networks/global-network';
import { setIsAccountSyncingReadyToBeDispatched } from '../actions/identity';
import { trace, endTrace, TraceName, TraceOperation } from './trace';
import { getTraceTags } from './sentry/tags';
import { store } from '../store';

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
        resolve(balanceHex || ZERO_BALANCE);
      }
    });
  });

/**
 * Add additional accounts in the wallet based on balance
 */
export default async () => {
  try {
    const { KeyringController } = Engine.context;
    const ethQuery = getGlobalEthQuery();

    trace({
      name: TraceName.EvmDiscoverAccounts,
      op: TraceOperation.DiscoverAccounts,
      tags: getTraceTags(store.getState()),
    });

    await KeyringController.withKeyring(
      { type: ExtendedKeyringTypes.hd, index: 0 },
      async ({ keyring }) => {
        for (let i = 0; i < MAX; i++) {
          // TODO: Maybe refactor this and re-use the same function for HD account creation
          // to have tracing in one single place?
          trace({
            name: TraceName.CreateHdAccount,
            op: TraceOperation.CreateAccount,
            tags: {
              ...getTraceTags(store.getState()),
              discovery: true,
            },
          });
          const [newAccount] = await keyring.addAccounts(1);
          endTrace({
            name: TraceName.CreateHdAccount,
          });

          let newAccountBalance = ZERO_BALANCE;
          try {
            newAccountBalance = await getBalance(newAccount, ethQuery);
          } catch (error) {
            // Errors are gracefully handled so that `withKeyring`
            // will not rollback the primary keyring, and accounts
            // created in previous loop iterations will remain in place.
          }

          if (newAccountBalance === ZERO_BALANCE) {
            // remove extra zero balance account we just added and break the loop
            keyring.removeAccount?.(newAccount);
            break;
          }
        }
      },
    );
  } finally {
    endTrace({
      name: TraceName.EvmDiscoverAccounts,
    });

    // We don't want to catch errors here, we let them bubble up to the caller
    // as we want to set `isAccountSyncingReadyToBeDispatched` to true either way
    await setIsAccountSyncingReadyToBeDispatched(true);
  }
};
