import { Hex } from '@metamask/utils';
import { Interface, parseUnits } from 'ethers/lib/utils';
import { Side, type OrderPreview } from '../../../types';
import {
  EIP712Domain,
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
  nowInSeconds,
}: {
  protocol: V1ProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  nowInSeconds?: number;
}): ProtocolUnsignedOrderV1;
export function buildProtocolUnsignedOrder({
  protocol,
  preview,
  makerAddress,
  signerAddress,
  nowInSeconds,
}: {
  protocol: V2ProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  nowInSeconds?: number;
}): ProtocolUnsignedOrderV2;
export function buildProtocolUnsignedOrder({
  protocol,
  preview,
  makerAddress,
  signerAddress,
  nowInSeconds = Math.floor(Date.now() / 1000),
}: {
  protocol: PolymarketProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  nowInSeconds?: number;
}): ProtocolUnsignedOrder {
  const makerAmount = parseUnits(
    preview.maxAmountSpent.toString(),
    6,
  ).toString();
  const takerAmount = getTakerAmountWithSlippage(preview);
  const baseOrder = {
    salt: generateSalt(),
    maker: makerAddress,
    signer: signerAddress,
    tokenId: preview.outcomeTokenId,
    makerAmount,
    takerAmount,
    expiration: '0',
    side: preview.side === Side.BUY ? UtilsSide.BUY : UtilsSide.SELL,
    signatureType: SignatureType.POLY_GNOSIS_SAFE,
  };

  if (protocol.key === 'v2') {
    const builder = protocol.order.getBuilderCode?.();

    if (!builder) {
      throw new Error('Missing Polymarket CLOB v2 builder code');
    }

    return {
      salt: baseOrder.salt,
      maker: baseOrder.maker,
      signer: baseOrder.signer,
      tokenId: baseOrder.tokenId,
      makerAmount: baseOrder.makerAmount,
      takerAmount: baseOrder.takerAmount,
      expiration: baseOrder.expiration,
      timestamp: `${nowInSeconds}`,
      metadata: protocol.order.metadata,
      builder,
      side: baseOrder.side,
      signatureType: baseOrder.signatureType,
    };
  }

  return {
    ...baseOrder,
    taker: '0x0000000000000000000000000000000000000000',
    nonce: '0',
    feeRateBps: preview.feeRateBps ?? '0',
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
  if (protocol.key === 'v2') {
    return {
      primaryType: 'Order',
      domain: {
        name: 'Polymarket CTF Exchange',
        version: protocol.order.domainVersion,
        chainId,
        verifyingContract,
      },
      types: {
        EIP712Domain: [
          ...EIP712Domain,
          { name: 'verifyingContract', type: 'address' },
        ],
        Order: [
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
        ],
      },
      message: order,
    };
  }

  return {
    primaryType: 'Order',
    domain: {
      name: 'Polymarket CTF Exchange',
      version: protocol.order.domainVersion,
      chainId,
      verifyingContract,
    },
    types: {
      EIP712Domain: [
        ...EIP712Domain,
        { name: 'verifyingContract', type: 'address' },
      ],
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
    },
    message: order,
  };
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
