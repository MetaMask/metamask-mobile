import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';
import {
  defaultAbiCoder,
  hexlify,
  Interface,
  keccak256,
  parseUnits,
  toUtf8Bytes,
} from 'ethers/lib/utils';
import { Side, type OrderPreview } from '../../../types';
import type { Signer } from '../../types';
import {
  EIP712Domain,
  HASH_ZERO_BYTES32,
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
const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet';
const DEPOSIT_WALLET_DOMAIN_VERSION = '1';
const ORDER_TYPE_STRING =
  'Order(uint256 salt,address maker,address signer,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint8 side,uint8 signatureType,uint256 timestamp,bytes32 metadata,bytes32 builder)';
const ORDER_TYPE_HASH = keccak256(toUtf8Bytes(ORDER_TYPE_STRING));
const DOMAIN_TYPE_HASH = keccak256(
  toUtf8Bytes(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
  ),
);
const ORDER_DOMAIN_TYPES = [
  ...EIP712Domain,
  { name: 'verifyingContract', type: 'address' },
];
const TYPED_DATA_SIGN_STRUCT = [
  { name: 'contents', type: ORDER_PRIMARY_TYPE },
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

function withoutHexPrefix(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

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

function getProtocolAppDomainSeparator({
  protocol,
  verifyingContract,
  chainId,
}: {
  protocol: PolymarketProtocolDefinition;
  verifyingContract: string;
  chainId: number;
}): string {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        DOMAIN_TYPE_HASH,
        keccak256(toUtf8Bytes(ORDER_DOMAIN_NAME)),
        keccak256(toUtf8Bytes(protocol.order.domainVersion)),
        chainId,
        verifyingContract,
      ],
    ),
  );
}

function getProtocolOrderContentsHash(order: ProtocolUnsignedOrder): string {
  if (!order.signer) {
    throw new Error('Missing Polymarket CLOB order signer');
  }

  if (order.signatureType === undefined) {
    throw new Error('Missing Polymarket CLOB order signature type');
  }

  return keccak256(
    defaultAbiCoder.encode(
      [
        'bytes32',
        'uint256',
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint8',
        'uint8',
        'uint256',
        'bytes32',
        'bytes32',
      ],
      [
        ORDER_TYPE_HASH,
        BigInt(order.salt).toString(),
        order.maker,
        order.signer,
        BigInt(order.tokenId).toString(),
        BigInt(order.makerAmount).toString(),
        BigInt(order.takerAmount).toString(),
        order.side,
        order.signatureType,
        BigInt(order.timestamp).toString(),
        order.metadata,
        order.builder,
      ],
    ),
  );
}

export async function signProtocolOrder({
  signer,
  protocol,
  order,
  verifyingContract,
  chainId = POLYGON_MAINNET_CHAIN_ID,
}: {
  signer: Signer;
  protocol: PolymarketProtocolDefinition;
  order: ProtocolUnsignedOrder;
  verifyingContract: string;
  chainId?: number;
}): Promise<string> {
  const typedData = getProtocolOrderTypedData({
    protocol,
    order,
    verifyingContract,
    chainId,
  });

  if (order.signatureType !== SignatureType.POLY_1271) {
    return signer.signTypedMessage(
      { data: typedData, from: signer.address },
      SignTypedDataVersion.V4,
    );
  }

  if (!order.signer) {
    throw new Error('Missing Polymarket deposit wallet signer');
  }

  const innerSignature = await signer.signTypedMessage(
    {
      from: signer.address,
      data: {
        primaryType: 'TypedDataSign',
        domain: typedData.domain,
        types: {
          EIP712Domain: ORDER_DOMAIN_TYPES,
          TypedDataSign: TYPED_DATA_SIGN_STRUCT,
          Order: typedData.types.Order,
        },
        message: {
          contents: typedData.message,
          name: DEPOSIT_WALLET_DOMAIN_NAME,
          version: DEPOSIT_WALLET_DOMAIN_VERSION,
          chainId,
          verifyingContract: order.signer,
          salt: HASH_ZERO_BYTES32,
        },
      },
    },
    SignTypedDataVersion.V4,
  );

  const appDomainSeparator = getProtocolAppDomainSeparator({
    protocol,
    verifyingContract,
    chainId,
  });
  const contentsHash = getProtocolOrderContentsHash(order);
  const contentsTypeHex = withoutHexPrefix(
    hexlify(toUtf8Bytes(ORDER_TYPE_STRING)),
  );
  const contentsTypeLengthHex = ORDER_TYPE_STRING.length
    .toString(16)
    .padStart(4, '0');

  return `0x${withoutHexPrefix(innerSignature)}${withoutHexPrefix(
    appDomainSeparator,
  )}${withoutHexPrefix(
    contentsHash,
  )}${contentsTypeHex}${contentsTypeLengthHex}`;
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
