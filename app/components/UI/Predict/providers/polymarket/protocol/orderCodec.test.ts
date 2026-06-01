import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { hexlify, toUtf8Bytes } from 'ethers/lib/utils';
import { Side, type OrderPreview } from '../../../types';
import type { Signer } from '../../types';
import { HASH_ZERO_BYTES32, POLYGON_MAINNET_CHAIN_ID } from '../constants';
import { OrderType, SignatureType } from '../types';
import { POLYMARKET_V2_PROTOCOL } from './definitions';
import {
  buildProtocolUnsignedOrder,
  encodeWrap,
  getPreviewFeeRateBpsForProtocol,
  getProtocolOrderTypedData,
  getProtocolVerifyingContract,
  serializeProtocolRelayerOrder,
  signProtocolOrder,
} from './orderCodec';
import { getMinAmountReceivedWithSlippage } from './slippage';

const preview: OrderPreview = {
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '1234',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.51,
  maxAmountSpent: 10,
  minAmountReceived: 19.45,
  slippage: 0.03,
  tickSize: 0.01,
  minOrderSize: 0.01,
  negRisk: false,
  feeRateBps: '77',
};

const ORDER_TYPE_STRING =
  'Order(uint256 salt,address maker,address signer,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint8 side,uint8 signatureType,uint256 timestamp,bytes32 metadata,bytes32 builder)';
const rawSignature = `0x${'11'.repeat(65)}`;
const ownerAddress = '0x1111111111111111111111111111111111111111';
const safeAddress = '0x2222222222222222222222222222222222222222';
const depositWalletAddress = '0x3333333333333333333333333333333333333333';

function createMockSigner(signature = rawSignature) {
  const signTypedMessage = jest.fn().mockResolvedValue(signature);
  const signer: Signer = {
    address: ownerAddress,
    signTypedMessage,
    signPersonalMessage: jest.fn(),
  };

  return { signer, signTypedMessage };
}

describe('polymarket protocol order codec', () => {
  const protocol = {
    ...POLYMARKET_V2_PROTOCOL,
    order: {
      ...POLYMARKET_V2_PROTOCOL.order,
      getBuilderCode: () =>
        '0x3333333333333333333333333333333333333333333333333333333333333333',
    },
  };

  it('builds a v2 order with timestamp, metadata, builder, and Safe signature type', () => {
    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress: ownerAddress,
      signerAddress: safeAddress,
      nowInSeconds: 456,
    });

    expect(order).toHaveProperty('timestamp', '456');
    expect(order).toHaveProperty(
      'metadata',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(order).toHaveProperty(
      'builder',
      '0x3333333333333333333333333333333333333333333333333333333333333333',
    );
    expect(order.signatureType).toBe(SignatureType.POLY_GNOSIS_SAFE);
    expect(order).toHaveProperty('takerAmount', '18866500');
    expect(order).not.toHaveProperty('taker');
    expect(order).not.toHaveProperty('nonce');
    expect(order).not.toHaveProperty('feeRateBps');
    expect(Object.keys(order)).toEqual([
      'salt',
      'maker',
      'signer',
      'tokenId',
      'makerAmount',
      'takerAmount',
      'expiration',
      'timestamp',
      'metadata',
      'builder',
      'side',
      'signatureType',
    ]);
  });

  it('builds a deposit-wallet order with POLY_1271 signature type', () => {
    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress: depositWalletAddress,
      signerAddress: depositWalletAddress,
      signatureType: SignatureType.POLY_1271,
      nowInSeconds: 456,
    });

    expect(SignatureType.POLY_1271).toBe(3);
    expect(order.maker).toBe(depositWalletAddress);
    expect(order.signer).toBe(depositWalletAddress);
    expect(order.signatureType).toBe(SignatureType.POLY_1271);
  });

  it('builds v2 typed data with domain version 2 and bytes32 fields', () => {
    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress: ownerAddress,
      signerAddress: safeAddress,
      nowInSeconds: 456,
    });

    const typedData = getProtocolOrderTypedData({
      protocol,
      order,
      verifyingContract: getProtocolVerifyingContract({
        protocol,
        negRisk: true,
      }),
    });

    expect(typedData.domain.version).toBe('2');
    expect(typedData.domain.verifyingContract).toBe(
      protocol.contracts.negRiskExchange,
    );
    expect(typedData.types.Order).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'metadata', type: 'bytes32' }),
        expect.objectContaining({ name: 'builder', type: 'bytes32' }),
      ]),
    );
  });

  it('signs Safe orders with the raw CLOB Order typed data', async () => {
    const { signer, signTypedMessage } = createMockSigner();
    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress: safeAddress,
      signerAddress: ownerAddress,
      nowInSeconds: 456,
    });
    const verifyingContract = getProtocolVerifyingContract({
      protocol,
      negRisk: false,
    });

    await expect(
      signProtocolOrder({ signer, protocol, order, verifyingContract }),
    ).resolves.toBe(rawSignature);

    expect(signTypedMessage).toHaveBeenCalledWith(
      {
        from: ownerAddress,
        data: expect.objectContaining({
          primaryType: 'Order',
          domain: expect.objectContaining({
            name: 'Polymarket CTF Exchange',
            version: '2',
            verifyingContract,
          }),
          message: order,
        }),
      },
      SignTypedDataVersion.V4,
    );
  });

  it('signs deposit-wallet orders with an ERC-7739 TypedDataSign wrapper', async () => {
    const { signer, signTypedMessage } = createMockSigner();
    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress: depositWalletAddress,
      signerAddress: depositWalletAddress,
      signatureType: SignatureType.POLY_1271,
      nowInSeconds: 456,
    });
    const verifyingContract = getProtocolVerifyingContract({
      protocol,
      negRisk: false,
    });

    const signature = await signProtocolOrder({
      signer,
      protocol,
      order,
      verifyingContract,
    });

    const expectedContentsTypeSuffix = `${hexlify(
      toUtf8Bytes(ORDER_TYPE_STRING),
    ).slice(2)}${ORDER_TYPE_STRING.length.toString(16).padStart(4, '0')}`;

    expect(signature.startsWith(rawSignature)).toBe(true);
    expect(signature.endsWith(expectedContentsTypeSuffix)).toBe(true);
    expect(signature.length).toBe(
      rawSignature.length + 32 * 2 + 32 * 2 + expectedContentsTypeSuffix.length,
    );
    expect(signTypedMessage).toHaveBeenCalledWith(
      {
        from: ownerAddress,
        data: expect.objectContaining({
          primaryType: 'TypedDataSign',
          domain: expect.objectContaining({
            name: 'Polymarket CTF Exchange',
            version: '2',
            chainId: POLYGON_MAINNET_CHAIN_ID,
            verifyingContract,
          }),
          types: expect.objectContaining({
            TypedDataSign: expect.arrayContaining([
              { name: 'contents', type: 'Order' },
              { name: 'verifyingContract', type: 'address' },
            ]),
            Order: expect.arrayContaining([
              { name: 'signatureType', type: 'uint8' },
            ]),
          }),
          message: {
            contents: order,
            name: 'DepositWallet',
            version: '1',
            chainId: POLYGON_MAINNET_CHAIN_ID,
            verifyingContract: depositWalletAddress,
            salt: HASH_ZERO_BYTES32,
          },
        }),
      },
      SignTypedDataVersion.V4,
    );
  });

  it('serializes signed orders into the relayer body shape', () => {
    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress: ownerAddress,
      signerAddress: safeAddress,
      nowInSeconds: 456,
    });

    const serialized = serializeProtocolRelayerOrder({
      signedOrder: {
        ...order,
        signature: '0xsig',
      },
      owner: 'owner-key',
      orderType: OrderType.FAK,
      side: Side.BUY,
    });

    expect(serialized).toEqual(
      expect.objectContaining({
        owner: 'owner-key',
        orderType: OrderType.FAK,
        order: expect.objectContaining({
          side: Side.BUY,
          signature: '0xsig',
          salt: expect.any(Number),
        }),
      }),
    );
    expect(serialized).not.toHaveProperty('deferExec');
    expect(serialized).not.toHaveProperty('postOnly');
  });

  it('forces preview fee rate to zero', () => {
    expect(getPreviewFeeRateBpsForProtocol()).toBe('0');
  });

  it('encodes wrap calls used by the legacy USDC.e sweep', () => {
    expect(
      encodeWrap({
        asset: protocol.collateral.legacyUsdceToken,
        to: ownerAddress,
        amount: 42n,
      }),
    ).toMatch(/^0x[0-9a-f]+$/u);
  });

  describe('getMinAmountReceivedWithSlippage', () => {
    it('uses the slippage-adjusted amount for BUY orders when above the buy floor', () => {
      expect(getMinAmountReceivedWithSlippage(preview)).toBeCloseTo(18.8665);
    });

    it('preserves the current BUY floor of maxAmountSpent plus tickSize', () => {
      const flooredPreview: OrderPreview = {
        ...preview,
        maxAmountSpent: 10,
        minAmountReceived: 9,
        tickSize: 0.01,
      };

      expect(getMinAmountReceivedWithSlippage(flooredPreview)).toBe(10.01);
    });

    it('uses only the slippage-adjusted amount for SELL orders', () => {
      const sellPreview: OrderPreview = {
        ...preview,
        side: Side.SELL,
        maxAmountSpent: 10,
        minAmountReceived: 9,
        slippage: 0.05,
        tickSize: 0.01,
      };

      expect(getMinAmountReceivedWithSlippage(sellPreview)).toBeCloseTo(8.55);
    });
  });
});
