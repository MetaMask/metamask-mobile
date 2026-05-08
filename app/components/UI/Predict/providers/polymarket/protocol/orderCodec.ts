import { Hex } from '@metamask/utils';
import { Interface, parseUnits } from 'ethers/lib/utils';
import { Side, type OrderPreview } from '../../../types';
import {
  EIP712Domain,
  POLYGON_MAINNET_CHAIN_ID,
  ROUNDING_CONFIG,
} from '../constants';
import {
  type OrderType,
  SignatureType,
  type TickSize,
  UtilsSide,
} from '../types';
import { generateSalt, roundOrderAmount } from '../utils';
import type { PolymarketProtocolDefinition } from './definitions';

export type ProtocolDefinition = PolymarketProtocolDefinition;

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

export type ProtocolUnsignedOrder = OrderDataV2 & { salt: string };
export type ProtocolSignedOrder = SignedOrderV2;
export type ProtocolRelayerOrder = ClobOrderObjectV2;

const ORDER_PRIMARY_TYPE = 'Order';
const ORDER_DOMAIN_NAME = 'Polymarket CTF Exchange';
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

function getProtocolOrderTypes() {
  return {
    EIP712Domain: ORDER_DOMAIN_TYPES,
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
  nowInSeconds = Math.floor(Date.now() / 1000),
}: {
  protocol: PolymarketProtocolDefinition;
  preview: OrderPreview;
  makerAddress: string;
  signerAddress: string;
  nowInSeconds?: number;
}): ProtocolUnsignedOrder {
  // NOTE: Field order matters for EIP-712 signing. Do NOT use object spread
  // (e.g. `...baseOrder`) to build the return object.
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
  const signatureType = SignatureType.POLY_GNOSIS_SAFE;
  const builder = protocol.order.getBuilderCode();

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
    types: getProtocolOrderTypes(),
    message: order,
  };
}

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
  return {
    order: {
      ...signedOrder,
      side,
      salt: parseInt(signedOrder.salt),
    },
    owner,
    orderType,
  };
}

export function getPreviewFeeRateBpsForProtocol(): string {
  return '0';
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
