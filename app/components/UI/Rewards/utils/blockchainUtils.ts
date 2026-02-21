import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { BlockchainEnum } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  isNonEvmAddress,
  isBtcAccount,
  isTronAccount,
} from '../../../../core/Multichain/utils';

/**
 * Maps a receivingBlockchain number from the API to a BlockchainEnum value.
 * @param receivingBlockchain - The blockchain ID from the drop (e.g. 1 = EVM, 2 = Solana)
 * @returns The corresponding BlockchainEnum value, or null if unknown
 */
export function mapReceivingBlockchainIdToEnum(
  receivingBlockchain: number,
): BlockchainEnum | null {
  const validValues: number[] = Object.values(BlockchainEnum).filter(
    (v): v is number => typeof v === 'number',
  );
  if (validValues.includes(receivingBlockchain)) {
    return receivingBlockchain as BlockchainEnum;
  }
  return null;
}

/**
 * Checks whether an account matches a given blockchain type.
 * @param account - The internal account to check
 * @param blockchain - The blockchain to match against
 * @returns true if the account belongs to the specified blockchain
 */
export function doesAccountMatchBlockchain(
  account: InternalAccount,
  blockchain: BlockchainEnum,
): boolean {
  switch (blockchain) {
    case BlockchainEnum.EVM:
      return !isNonEvmAddress(account.address);
    case BlockchainEnum.SOLANA:
      return isSolanaAddress(account.address);
    case BlockchainEnum.BITCOIN:
      return isBtcAccount(account);
    case BlockchainEnum.TRON:
      return isTronAccount(account);
    default:
      return false;
  }
}

/**
 * Finds the first account in a list that matches a given blockchain type.
 * @param accounts - The list of internal accounts to search
 * @param blockchain - The blockchain to match against
 * @returns The first matching account, or undefined if none found
 */
export function findMatchingBlockchainAccount(
  accounts: readonly InternalAccount[],
  blockchain: BlockchainEnum,
): InternalAccount | undefined {
  return accounts.find((account) =>
    doesAccountMatchBlockchain(account, blockchain),
  );
}
