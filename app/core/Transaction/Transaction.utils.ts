import {
  Log,
  TransactionMeta,
  TransactionReceipt,
} from '@metamask/transaction-controller';

// TODO add description
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTokenIdParam(tokenData: any = {}): string | undefined {
  return (
    tokenData?.args?._tokenId?.toString() ?? tokenData?.args?.id?.toString()
  );
}

export const TRANSFER_SINFLE_LOG_TOPIC_HASH =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';

export const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

type ExtendedLog = Log & { data?: string };

type ExtendedTxReceipt = TransactionReceipt & { logs?: ExtendedLog[] };

export type ExtendedTransactionMeta = TransactionMeta & {
  txReceipt?: ExtendedTxReceipt;
};

export type NftTransferLog = ExtendedTxReceipt & {
  isERC1155NftTransfer: boolean;
  isERC721NftTransfer: boolean;
  isTransferToSelectedAddress: boolean;
};
