import { LogDescription } from '@ethersproject/abi';
import {
  Log,
  TransactionMeta,
  TransactionReceipt,
} from '@metamask/transaction-controller';

/**
 * Returns the '_tokenId' parameter or the 'id' param of the parsed transaction logs;
 * The tokenId and id are defined in the ERC721 and ERC1155 ABIs from metamask-eth-abis (https://github.com/MetaMask/metamask-eth-abis/tree/main/src/abis)
 * @param tokenData the parsed transaction log param
 * @returns the tokenId value as string or undefined
 */
export function getTokenIdParam(tokenData: LogDescription): string | undefined {
  return (
    tokenData?.args?._tokenId?.toString() ?? tokenData?.args?.id?.toString()
  );
}

export const TRANSFER_SINFLE_LOG_TOPIC_HASH =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';

export const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export type ExtendedLog = Log & { data?: string };

export type ExtendedTxReceipt = TransactionReceipt & { logs?: ExtendedLog[] };

export type ExtendedTransactionMeta = TransactionMeta & {
  txReceipt?: ExtendedTxReceipt;
};

export type NftTransferLog = ExtendedLog & {
  isERC1155NftTransfer: boolean;
  isERC721NftTransfer: boolean;
  isTransferToSelectedAddress: boolean | undefined;
};

export type parsedNftLog = LogDescription & {
  contract: string | undefined;
};
