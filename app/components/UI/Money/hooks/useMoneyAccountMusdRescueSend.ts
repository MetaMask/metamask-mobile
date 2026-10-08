import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { isMonadMainnetChainId } from '../../../../util/networks';
import { refreshMoneyAccountBalanceFresh } from '../utils/invalidateMoneyAccountBalanceCaches';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../Earn/constants/musd';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { isUserRejectedError } from '../../../../util/errorHandling/isUserRejectedError';
import { calcTokenValue } from '../../../../util/transactions';

const LOG_TAG = '[Money Account mUSD Rescue Send]';

const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount)'];

/**
 * True when the rescue send's full-screen confirmation is the focused route.
 * Used to back out of the confirmation if transaction setup fails after it was
 * already opened.
 */
function isMoneyConfirmationActive(): boolean {
  return (
    NavigationService.navigation.getCurrentRoute()?.name ===
    Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
  );
}

/** Names the safety gate that rejected a rescue send initiation. */
export type MusdRescueSendBlockReason =
  | 'missing-money-account'
  | 'missing-vault-config'
  | 'unsupported-chain'
  | 'invalid-recipient'
  | 'invalid-amount'
  | 'balance-unavailable'
  | 'vmusd-balance-present'
  | 'amount-exceeds-balance';

/**
 * Encodes the ERC-20 `transfer(recipient, amount)` calldata for the rescue
 * send. The transaction targets the mUSD token contract itself — no Teller
 * withdraw, no BoringVault approval/deposit, no vault batch.
 *
 * @param recipient - External address receiving the mUSD.
 * @param amountRaw - Amount in raw mUSD units (6 decimals).
 * @returns The encoded `transfer` calldata as a hex string.
 */
export function buildMusdRescueTransferData(
  recipient: string,
  amountRaw: bigint,
): Hex {
  const iface = new ethers.utils.Interface(ERC20_TRANSFER_ABI);
  return iface.encodeFunctionData('transfer', [
    recipient,
    amountRaw.toString(),
  ]) as Hex;
}

/**
 * Recovery-only path for sending bare (unprocessed) mUSD out of a Money
 * Account. Builds a single ERC-20 `transfer` from the primary Money Account
 * address on the Money chain (Monad today) and feeds it to the existing
 * transaction confirmation/signing route.
 *
 * Safety gates (each throws with a `reason`):
 * - a fresh canonical liquid balance must be available
 * - amount must be positive and never exceed the liquid balance
 * - recipient must be a valid address
 */
export function useMoneyAccountMusdRescueSend() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const navigation = useNavigation<AppNavigationProp>();

  const initiateRescueSend = useCallback(
    async ({
      recipient,
      amount,
    }: {
      recipient: string;
      /** Human-readable mUSD amount (e.g. "10.5"). */
      amount: string;
    }): Promise<void> => {
      const moneyAccountAddress = primaryMoneyAccount?.address;
      if (!moneyAccountAddress) {
        throw Object.assign(
          new Error(`${LOG_TAG} Missing money account address`),
          { reason: 'missing-money-account' },
        );
      }
      if (!vaultConfig) {
        throw Object.assign(new Error(`${LOG_TAG} Missing vault config`), {
          reason: 'missing-vault-config',
        });
      }

      const chainIdHex = vaultConfig.chainId as Hex;
      const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainIdHex];
      if (!musdAddress) {
        throw Object.assign(
          new Error(`${LOG_TAG} mUSD not deployed on chain ${chainIdHex}`),
          { reason: 'unsupported-chain' },
        );
      }
      if (!ethers.utils.isAddress(recipient)) {
        throw Object.assign(new Error(`${LOG_TAG} Invalid recipient address`), {
          reason: 'invalid-recipient',
        });
      }

      const amountRaw = BigInt(
        calcTokenValue(amount, MUSD_DECIMALS)
          .decimalPlaces(0, BigNumber.ROUND_DOWN)
          .toFixed(0),
      );
      if (amountRaw <= BigInt(0)) {
        throw Object.assign(new Error(`${LOG_TAG} Invalid amount`), {
          reason: 'invalid-amount',
        });
      }

      // Re-read the canonical balance from the API/RPC immediately before
      // creating the confirmation transaction. This prevents a stale sheet
      // value from being used if CHOMP processes the funds while the sheet is
      // open. If the fresh read fails, no transaction is created.
      const currentBalance =
        await refreshMoneyAccountBalanceFresh(moneyAccountAddress);
      const balanceRaw = BigInt(currentBalance.musdBalance);
      if (BigInt(currentBalance.vmusdValueInMusd) > 0n) {
        throw Object.assign(
          new Error(
            `${LOG_TAG} Rescue send is unavailable while vmUSD-backed balance is present`,
          ),
          { reason: 'vmusd-balance-present' },
        );
      }
      if (amountRaw > balanceRaw) {
        throw Object.assign(
          new Error(
            `${LOG_TAG} Amount ${amountRaw} exceeds current liquid mUSD balance ${balanceRaw}`,
          ),
          { reason: 'amount-exceeds-balance' },
        );
      }

      const networkClientId =
        Engine.context.NetworkController.findNetworkClientIdByChainId(
          chainIdHex,
        );
      if (!networkClientId) {
        throw new Error(
          `${LOG_TAG} Network client not found for chain ${chainIdHex}`,
        );
      }

      // Monad gas sponsorship matches the other Money flows' wiring — the
      // sponsored flag is carried on the transaction meta for this direct
      // ERC-20 transfer shape.
      const isGasFeeSponsored = isMonadMainnetChainId(chainIdHex);
      const transferData = buildMusdRescueTransferData(recipient, amountRaw);

      navigation.dispatch(
        StackActions.replace(Routes.MONEY.CONFIRMATIONS_ROOT, {
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          params: { loader: ConfirmationLoader.Transfer },
        }),
      );

      try {
        await addTransactionBatch({
          disableHook: true,
          disableSequential: true,
          disableUpgrade: true,
          from: moneyAccountAddress as Hex,
          isGasFeeSponsored,
          isInternal: true,
          networkClientId,
          origin: ORIGIN_METAMASK,
          skipInitialGasEstimate: true,
          transactions: [
            {
              params: {
                to: musdAddress,
                data: transferData,
                value: '0x0' as Hex,
              },
              type: TransactionType.tokenMethodTransfer,
            },
          ],
        });
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        // The confirmation was opened before the batch was created, so back out
        // of it on failure — otherwise the user is stranded on an empty
        // confirmation loader while the sheet error renders behind it.
        if (
          !isUserRejectedError(error, errorObj.message) &&
          isMoneyConfirmationActive()
        ) {
          navigation.goBack();
        }
        Logger.error(errorObj, `${LOG_TAG} Rescue send initiation failed`);
        throw errorObj;
      }
    },
    [navigation, primaryMoneyAccount, vaultConfig],
  );

  return { initiateRescueSend };
}

export default useMoneyAccountMusdRescueSend;
