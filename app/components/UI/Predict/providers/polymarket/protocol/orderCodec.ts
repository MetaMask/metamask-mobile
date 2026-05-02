import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';
import { Interface, parseUnits, toUtf8Bytes } from 'ethers/lib/utils';
import { Side, type OrderPreview } from '../../../types';
import {
  EIP712Domain,
  HASH_ZERO_BYTES32,
  POLYGON_MAINNET_CHAIN_ID,
  ROUNDING_CONFIG,
} from '../constants';
import {
  type ClobOrderObject,
  type OrderData,
  OrderType,
  SignatureType,
  type TickSize,
  UtilsSide,
} from '../types';
import { generateSalt, roundOrderAmount } from '../utils';
import type { PolymarketProtocolDefinition } from './definitions';

export type V1ProtocolDefinition = Extract<
  PolymarketProtocolDefinition,
  { key: 'v1' }
>;
export type V2ProtocolDefinition = Extract<
  PolymarketProtocolDefinition,
  { key: 'v2' }
>;

export interface OrderDataV2 {
  maker: string;
  signer?: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  side: UtilsSide;
  expiration?: string;
  signatureType?: SignatureType;
  timestamp: string;
  metadata: string;
  builder: string;
}

export interface SignedOrderV2 extends OrderDataV2 {
  salt: string;
  signature: string;
}

export interface ClobOrderObjectV2 {
  order: Omit<SignedOrderV2, 'side' | 'salt'> & {
    side: Side;
    salt: number;
  };
  owner: string;
  orderType: OrderType;
}

export type ProtocolUnsignedOrderV1 = OrderData & { salt: string };
export type ProtocolUnsignedOrderV2 = OrderDataV2 & { salt: string };
export type ProtocolUnsignedOrder =
  | ProtocolUnsignedOrderV1
  | ProtocolUnsignedOrderV2;
export type ProtocolSignedOrderV1 = ProtocolUnsignedOrderV1 & {
  signature: string;
};
export type ProtocolSignedOrderV2 = SignedOrderV2;
export type ProtocolSignedOrder = ProtocolSignedOrderV1 | ProtocolSignedOrderV2;
export type ProtocolRelayerOrder = ClobOrderObject | ClobOrderObjectV2;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ORDER_PRIMARY_TYPE = 'Order';
const ORDER_DOMAIN_NAME = 'Polymarket CTF Exchange';
const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet';
const DEPOSIT_WALLET_DOMAIN_VERSION = '1';
const ORDER_TYPE_STRING =
  'Order(uint256 salt,address maker,address signer,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint8 side,uint8 signatureType,uint256 timestamp,bytes32 metadata,bytes32 builder)';
const V2_ORDER_TYPES = [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'address' },
  { name: 'signer', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'metadata', type: 'bytes32' },
  { name: 'builder', type: 'bytes32' },
];
const ORDER_DOMAIN_TYPES = [
  ...EIP712Domain,
  { name: 'verifyingContract', type: 'address' },
];

function buildProtocolOrderDomain({
  protocol,
  verifyingContract,
  chainId,
}: {
  protocol: PolymarketProtocolDefinition;
  verifyingContract: string;
  chainId: number;
}) {
  return {
    name: ORDER_DOMAIN_NAME,
    version: protocol.order.domainVersion,
    chainId,
    verifyingContract,
  };
}

function getProtocolOrderTypes(protocol: PolymarketProtocolDefinition) {
  if (protocol.key === 'v2') {
    return {
      EIP712Domain: ORDER_DOMAIN_TYPES,
      Order: V2_ORDER_TYPES,
    };
  }

  return {
    EIP712Domain: ORDER_DOMAIN_TYPES,
    Order: [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'signer', type: 'address' },
      { name: 'taker', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'makerAmount', type: 'uint256' },
      { name: 'takerAmount', type: 'uint256' },
      { name: 'expiration', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'feeRateBps', type: 'uint256' },
      { name: 'side', type: 'uint8' },
      { name: 'signatureType', type: 'uint8' },
    ],
  };
}

function getTakerAmountWithSlippage(preview: OrderPreview): string {
  const roundConfig = ROUNDING_CONFIG[preview.tickSize.toString() as TickSize];
  const decimals = roundConfig.amount ?? 4;

  let minAmountWithSlippage =
    preview.minAmountReceived * (1 - preview.slippage);

  if (preview.side === Side.BUY) {
    minAmountWithSlippage = Math.max(
      minAmountWithSlippage,
      preview.maxAmountSpent + preview.tickSize,
    );
  }

  return parseUnits(
    roundOrderAmount({
      amount: minAmountWithSlippage,
      decimals,
    }).toString(),
    6,
  ).toString();
}

export function buildProtocolUnsignedOrder({
  protocol,
  preview,
  makerAddress,
  signerAddress,
  signatureType,
  nowInSeconds,
}: {
  protocol: V1ProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  signatureType?: SignatureType;
  nowInSeconds?: number;
}): ProtocolUnsignedOrderV1;
export function buildProtocolUnsignedOrder({
  protocol,
  preview,
  makerAddress,
  signerAddress,
  signatureType,
  nowInSeconds,
}: {
  protocol: V2ProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  signatureType?: SignatureType;
  nowInSeconds?: number;
}): ProtocolUnsignedOrderV2;
export function buildProtocolUnsignedOrder({
  protocol,
  preview,
  makerAddress,
  signerAddress,
  signatureType = SignatureType.POLY_GNOSIS_SAFE,
  nowInSeconds = Math.floor(Date.now() / 1000),
}: {
  protocol: PolymarketProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  signatureType?: SignatureType;
  nowInSeconds?: number;
}): ProtocolUnsignedOrder {
  // NOTE: Field order matters for EIP-712 signing. Do NOT use object spread
  // (e.g. `...baseOrder`) to build these return objects — it causes fields like
  // `taker` (v1) to land in the wrong position, resulting in an "invalid API" error.
  const salt = generateSalt();
  const maker = makerAddress;
  const signer = signerAddress;
  const tokenId = preview.outcomeTokenId;
  const makerAmount = parseUnits(
    preview.maxAmountSpent.toString(),
    6,
  ).toString();
  const takerAmount = getTakerAmountWithSlippage(preview);
  const side = preview.side === Side.BUY ? UtilsSide.BUY : UtilsSide.SELL;

  if (protocol.key === 'v2') {
    const builder = protocol.order.getBuilderCode?.();

    if (!builder) {
      throw new Error('Missing Polymarket CLOB v2 builder code');
    }

    return {
      salt,
      maker,
      signer,
      tokenId,
      makerAmount,
      takerAmount,
      expiration: '0',
      timestamp: `${nowInSeconds}`,
      metadata: protocol.order.metadata,
      builder,
      side,
      signatureType,
    };
  }

  return {
    salt,
    maker,
    signer,
    taker: ZERO_ADDRESS,
    tokenId,
    makerAmount,
    takerAmount,
    expiration: '0',
    nonce: '0',
    feeRateBps: preview.feeRateBps ?? '0',
    side,
    signatureType,
  };
}

export function getProtocolVerifyingContract({
  protocol,
  negRisk,
}: {
  protocol: PolymarketProtocolDefinition;
  negRisk: boolean;
}): string {
  return negRisk
    ? protocol.contracts.negRiskExchange
    : protocol.contracts.exchange;
}

export function getProtocolOrderTypedData({
  protocol,
  order,
  verifyingContract,
  chainId = POLYGON_MAINNET_CHAIN_ID,
}: {
  protocol: PolymarketProtocolDefinition;
  order: ProtocolUnsignedOrder;
  verifyingContract: string;
  chainId?: number;
}) {
  return {
    primaryType: ORDER_PRIMARY_TYPE,
    domain: buildProtocolOrderDomain({
      protocol,
      verifyingContract,
      chainId,
    }),
    types: getProtocolOrderTypes(protocol),
    message: order,
  };
}

export async function signProtocolOrderForDepositWallet({
  order,
  domain,
  signTypedMessage,
  from,
}: {
  order: ProtocolUnsignedOrderV2;
  domain: ReturnType<typeof buildProtocolOrderDomain>;
  signTypedMessage: (
    params: TypedMessageParams,
    version: SignTypedDataVersion,
  ) => Promise<string>;
  from: string;
}): Promise<string> {
  if (!order.signer) {
    throw new Error('Deposit wallet order signer is required');
  }

  if (order.signatureType === undefined) {
    throw new Error('Deposit wallet order signature type is required');
  }

  const orderTypes = { Order: V2_ORDER_TYPES };
  const orderMessage = {
    salt: order.salt,
    maker: order.maker,
    signer: order.signer,
    tokenId: order.tokenId,
    makerAmount: order.makerAmount,
    takerAmount: order.takerAmount,
    side: order.side,
    signatureType: order.signatureType,
    timestamp: order.timestamp,
    metadata: order.metadata,
    builder: order.builder,
  };
  const contentsHash = ethers.utils._TypedDataEncoder.hashStruct(
    ORDER_PRIMARY_TYPE,
    orderTypes,
    orderMessage,
  );
  const appDomainSeparator = ethers.utils._TypedDataEncoder.hashDomain(domain);
  const data = {
    domain,
    types: {
      EIP712Domain: ORDER_DOMAIN_TYPES,
      TypedDataSign: [
        { name: 'contents', type: ORDER_PRIMARY_TYPE },
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
        { name: 'salt', type: 'bytes32' },
      ],
      Order: orderTypes.Order,
    },
    primaryType: 'TypedDataSign',
    message: {
      contents: orderMessage,
      name: DEPOSIT_WALLET_DOMAIN_NAME,
      version: DEPOSIT_WALLET_DOMAIN_VERSION,
      chainId: domain.chainId,
      verifyingContract: order.signer,
      salt: HASH_ZERO_BYTES32,
    },
  };
  const innerSignature = await signTypedMessage(
    { data, from },
    SignTypedDataVersion.V4,
  );
  const orderTypeHex = ethers.utils.hexlify(toUtf8Bytes(ORDER_TYPE_STRING));
  const orderTypeLengthHex = ORDER_TYPE_STRING.length
    .toString(16)
    .padStart(4, '0');

  return `0x${innerSignature.slice(2)}${appDomainSeparator.slice(
    2,
  )}${contentsHash.slice(2)}${orderTypeHex.slice(2)}${orderTypeLengthHex}`;
}

export function serializeProtocolRelayerOrder({
  signedOrder,
  owner,
  orderType,
  side,
}: {
  signedOrder: ProtocolSignedOrderV1;
  owner: string;
  orderType: OrderType;
  side: Side;
}): ClobOrderObject;
export function serializeProtocolRelayerOrder({
  signedOrder,
  owner,
  orderType,
  side,
}: {
  signedOrder: ProtocolSignedOrderV2;
  owner: string;
  orderType: OrderType;
  side: Side;
}): ClobOrderObjectV2;
export function serializeProtocolRelayerOrder({
  signedOrder,
  owner,
  orderType,
  side,
}: {
  signedOrder: ProtocolSignedOrder;
  owner: string;
  orderType: OrderType;
  side: Side;
}): ProtocolRelayerOrder {
  const order = {
    ...signedOrder,
    side,
    salt: parseInt(signedOrder.salt),
  };

  if ('builder' in signedOrder) {
    return {
      order: order as ClobOrderObjectV2['order'],
      owner,
      orderType,
    };
  }

  return {
    order: order as ClobOrderObject['order'],
    owner,
    orderType,
  };
}

export function getPreviewFeeRateBpsForProtocol({
  protocol,
  preview,
}: {
  protocol: PolymarketProtocolDefinition;
  preview: OrderPreview;
}): string {
  if (protocol.key === 'v2') {
    return '0';
  }

  return preview.feeRateBps ?? '0';
}

export function encodeWrap({
  asset,
  to,
  amount,
}: {
  asset: string;
  to: string;
  amount: bigint | string;
}): Hex {
  return new Interface([
    'function wrap(address _asset, address _to, uint256 _amount)',
  ]).encodeFunctionData('wrap', [asset, to, amount]) as Hex;
}

export function encodeUnwrap({
  asset,
  to,
  amount,
}: {
  asset: string;
  to: string;
  amount: bigint | string;
}): Hex {
  return new Interface([
    'function unwrap(address _asset, address _to, uint256 _amount)',
  ]).encodeFunctionData('unwrap', [asset, to, amount]) as Hex;
}
