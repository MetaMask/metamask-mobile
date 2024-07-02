import { IconName } from 'app/component-library/components/Icons/Icon';
import { TRIGGER_TYPES } from '../constants';
import { Notification } from '../types';
import { ImageSourcePropType } from 'react-native';

export enum TxStatus {
  UNAPPROVED = 'unapproved',
  SUBMITTED = 'submitted',
  SIGNED = 'signed',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  APPROVED = 'approved',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

type StakeNotification = Extract<
  Notification,
  { type: TRIGGER_TYPES.LIDO_STAKE_COMPLETED }
>;

type StakeWithdrawNotification = Extract<
  Notification,
  { type: TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN }
>;

type SwapNotification = Extract<
  Notification,
  { type: TRIGGER_TYPES.METAMASK_SWAP_COMPLETED }
>;

export interface NotificationStakeDetails {
  type:
    | TRIGGER_TYPES.LIDO_STAKE_COMPLETED
    | TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED
    | TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED
    | TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED
    | TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED;
  stake_in: StakeNotification['data']['stake_in'];
  stake_out: StakeNotification['data']['stake_out'];
  tx_hash: string;
  status: TxStatus.CONFIRMED | TxStatus.UNAPPROVED;
  network: {
    name: string;
    image?: string | ImageSourcePropType;
  };
  networkFee: {
    gas_price: string;
    native_token_price_in_usd: string;
  };
}

export interface NotificationStakeWithdrawDetails {
  type: TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN;
  from?: StakeWithdrawNotification['address'];
  request_id: StakeWithdrawNotification['data']['request_id'];
  staked_eth: StakeWithdrawNotification['data']['staked_eth'];
  tx_hash: string;
  status: TxStatus.CONFIRMED | TxStatus.UNAPPROVED;
  network: {
    name: string;
    image?: string | ImageSourcePropType;
  };
}

export interface NotificationSwapDetails {
  type: TRIGGER_TYPES.METAMASK_SWAP_COMPLETED;
  from?: SwapNotification['address'];
  rate: string;
  token_in: SwapNotification['data']['token_in'];
  token_out: SwapNotification['data']['token_out'];
  tx_hash: string;
  status: TxStatus.CONFIRMED | TxStatus.UNAPPROVED;
  network: {
    name: string;
    image?: string | ImageSourcePropType;
  };
  networkFee: {
    gas_price: string;
    native_token_price_in_usd: string;
  };
}

export interface TokenTransferDetails {
  type:
    | TRIGGER_TYPES.ETH_RECEIVED
    | TRIGGER_TYPES.ETH_SENT
    | TRIGGER_TYPES.ERC20_SENT
    | TRIGGER_TYPES.ERC20_RECEIVED;
  from: string;
  to: string;
  tx_hash: string;
  status: TxStatus.CONFIRMED | TxStatus.UNAPPROVED;
  network: {
    name: string;
    image?: string | ImageSourcePropType;
  };
  networkFee: {
    gas_price: string;
    native_token_price_in_usd: string;
  };

  // This is available for ERC20, but we need to construct this for Native Tokens
  token: {
    name: string;
    symbol: string;
    image?: string | ImageSourcePropType;
    address: string;
    amount: string;
  };
}

export interface NFTTransferDetails {
  type:
    | TRIGGER_TYPES.ERC1155_RECEIVED
    | TRIGGER_TYPES.ERC1155_SENT
    | TRIGGER_TYPES.ERC721_RECEIVED
    | TRIGGER_TYPES.ERC721_SENT;
  nft: {
    name?: string;
    image?: string;
  };
  from: string;
  to: string;
  tx_hash: string;
  status: TxStatus.CONFIRMED | TxStatus.UNAPPROVED;
  collection?: {
    address: string;
    name: string;
    symbol: string;
    image?: string;
  };
  network: {
    name: string;
    image?: string;
  };
  networkFee: {
    gas_price: string;
    native_token_price_in_usd: string;
  };
}

export interface NotificationRowDetails {
  row: {
    title: string;
    createdAt: string;

    badgeIcon?: IconName;
    imageUrl?: string;
    description?: {
      asset?: {
        symbol?: string;
        name?: string;
      };
      text?: string;
    };
    value?: string;
  };
  details:
    | NotificationStakeDetails
    | NotificationStakeWithdrawDetails
    | NotificationSwapDetails
    | TokenTransferDetails
    | NFTTransferDetails;
}
