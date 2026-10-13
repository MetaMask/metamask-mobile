import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { useSelector } from 'react-redux';
import type { NetworkClientId } from '@metamask/network-controller';
import { Hex, bytesToHex } from '@metamask/utils';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { isMonadMainnetChainId } from '../../../../util/networks';
import { refreshMoneyAccountBalanceFresh } from '../utils/invalidateMoneyAccountBalanceCaches';
import {
  registerMusdRescueSendSubmission,
  markMusdRescueSendSetupFailed,
  isMusdRescueSendInFlight,
  beginMusdRescueSendAttempt,
  endMusdRescueSendAttempt,
} from '../utils/musdRescueInFlight';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../Earn/constants/musd';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { calcTokenValue } from '../../../../util/transactions';
import useMoneyToasts from './useMoneyToasts';
import { useMoneyNavigation } from './useMoneyNavigation';

const LOG_TAG = '[Money Account mUSD Rescue Send]';

const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount)'];

/** Names the safety gate that rejected a rescue send initiation. */
export type MusdRescueSendBlockReason =
  | 'in-flight'
  | 'missing-money-account'
  | 'missing-vault-config'
  | 'unsupported-chain'
  | 'invalid-recipient'
  | 'invalid-amount'
  | 'recipient-not-same-srp'
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

/** Result of the preparation stage of a rescue send. */
export interface PreparedMusdRescueSend {
  batchId: Hex;
  moneyAccountAddress: Hex;
  musdAddress: Hex;
  networkClientId: NetworkClientId;
  chainIdHex: Hex;
  isGasFeeSponsored: boolean;
  transferData: Hex;
  amountRaw: bigint;
}

/**
 * Recovery-only path for sending bare (unprocessed) mUSD out of a Money
 * Account. The send is a single ERC-20 `transfer` from the primary Money
 * Account address on the Money chain (Monad today), submitted directly with
 * `requireApproval: false` — the rescue review screen is the user's approval,
 * so no standard confirmation route is opened.
 *
 * Safety gates (each throws with a `reason`):
 * - no other rescue submission may be in flight
 * - a fresh canonical liquid balance must be available
 * - amount must be positive and never exceed the liquid balance
 * - recipient must be a valid address on the Money Account's SRP
 */
export function useMoneyAccountMusdRescueSend() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const { navigateToMoneyHome } = useMoneyNavigation();

  /**
   * Stage 1 — validate everything against fresh state and prepare the
   * transaction. Purely async checks; no navigation, no state mutation.
   *
   * @param params.recipient - Recipient EVM address.
   * @param params.amount - Human-readable mUSD amount (e.g. "10.5").
   * @param params.sameSrpAddresses - Addresses eligible as rescue recipients.
   * @returns The prepared transaction details for the submission stage.
   */
  const prepareRescueSend = useCallback(
    async ({
      recipient,
      amount,
      sameSrpAddresses,
    }: {
      recipient: string;
      /** Human-readable mUSD amount (e.g. "10.5"). */
      amount: string;
      /** Lowercase-addressable list of eligible same-SRP recipient addresses. */
      sameSrpAddresses: string[];
    }): Promise<PreparedMusdRescueSend> => {
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
      // Submission-time revalidation of the recipient restriction: the review
      // screen resolves ids against the eligible list, but that list can
      // change between selection and Send. Imported/hardware/other-SRP
      // addresses are never accepted here. Compare case-insensitively — the
      // eligible list is built from checksummed internal accounts.
      const recipientLower = recipient.toLowerCase();
      const recipientIsSameSrp = sameSrpAddresses.some(
        (address) => address.toLowerCase() === recipientLower,
      );
      if (!recipientIsSameSrp) {
        throw Object.assign(
          new Error(`${LOG_TAG} Recipient is not on the Money Account's SRP`),
          { reason: 'recipient-not-same-srp' },
        );
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
      // creating the transaction. This prevents a stale screen value from
      // being used if CHOMP processes the funds while the review is open. If
      // the fresh read fails, no transaction is created.
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
      if (amountRaw !== balanceRaw) {
        // The reviewed amount is always the full liquid balance. If the fresh
        // read differs, the balance moved since review — fail instead of
        // silently sending a different amount. The user re-reviews and
        // re-confirms with the refreshed figure.
        throw Object.assign(
          new Error(
            `${LOG_TAG} Reviewed amount ${amountRaw} no longer matches current liquid mUSD balance ${balanceRaw}`,
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

      return {
        batchId: bytesToHex(new Uint8Array(uuidParse(uuidv4()))) as Hex,
        moneyAccountAddress: moneyAccountAddress as Hex,
        musdAddress: musdAddress as Hex,
        networkClientId,
        chainIdHex,
        isGasFeeSponsored,
        transferData,
        amountRaw,
      };
    },
    [primaryMoneyAccount, vaultConfig],
  );

  /**
   * Stage 2 — hand the prepared transaction to the controller. Fire-and-forget
   * from the caller's perspective: navigation to Money Home happens as soon as
   * this returns, while the promise continues in the background.
   *
   * @param prepared - Output of {@link prepareRescueSend}.
   */
  const submitRescueSend = useCallback(
    (prepared: PreparedMusdRescueSend, attemptId: string): void => {
      const completion = addTransactionBatch({
        batchId: prepared.batchId,
        requireApproval: false,
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        from: prepared.moneyAccountAddress,
        isGasFeeSponsored: prepared.isGasFeeSponsored,
        isInternal: true,
        networkClientId: prepared.networkClientId,
        origin: ORIGIN_METAMASK,
        skipInitialGasEstimate: true,
        transactions: [
          {
            params: {
              to: prepared.musdAddress,
              data: prepared.transferData,
              value: '0x0' as Hex,
            },
            type: TransactionType.tokenMethodTransfer,
          },
        ],
      }).then(
        () => 'submitted' as const,
        (error: unknown) => {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));
          Logger.error(errorObj, `${LOG_TAG} Rescue send submission failed`);
          // The user is already on Money Home with a pending toast. Surface
          // the failure through the monitor even though no transaction
          // metadata exists for this attempt.
          markMusdRescueSendSetupFailed(prepared.batchId);
          throw errorObj;
        },
      );
      registerMusdRescueSendSubmission({
        batchId: prepared.batchId,
        completion,
        attemptId,
      });
    },
    [],
  );

  const initiateRescueSend = useCallback(
    async ({
      recipient,
      amount,
      sameSrpAddresses,
    }: {
      recipient: string;
      /** Human-readable mUSD amount (e.g. "10.5"). */
      amount: string;
      /** Lowercase-addressable list of eligible same-SRP recipient addresses. */
      sameSrpAddresses: string[];
    }): Promise<void> => {
      if (isMusdRescueSendInFlight()) {
        throw Object.assign(
          new Error(`${LOG_TAG} Rescue send already in flight`),
          { reason: 'in-flight' },
        );
      }
      // Open the in-flight attempt before any async work so the prepare
      // window (fresh-balance network read) is also covered: the sending
      // screen may unmount during the await and lose its local tap guard,
      // and a second Send here would otherwise start a second transfer.
      const attemptId = beginMusdRescueSendAttempt();
      let prepared: PreparedMusdRescueSend;
      try {
        prepared = await prepareRescueSend({
          recipient,
          amount,
          sameSrpAddresses,
        });
      } catch (error) {
        endMusdRescueSendAttempt(attemptId);
        throw error;
      }
      // The user has confirmed on the review screen. Show the pending toast
      // immediately, navigate home, and let the submission promise settle in
      // the background — the global Money transaction monitor owns the
      // success/failure toasts from here. Submission is registered before
      // returning so a fast unmount cannot lose duplicate protection; the
      // registered entry supersedes this attempt's placeholder.
      showToast(MoneyToastOptions.rescue?.inProgress() as never);
      navigateToMoneyHome();
      submitRescueSend(prepared, attemptId);
    },
    [
      MoneyToastOptions.rescue,
      navigateToMoneyHome,
      prepareRescueSend,
      showToast,
      submitRescueSend,
    ],
  );

  return { initiateRescueSend };
}

export default useMoneyAccountMusdRescueSend;
