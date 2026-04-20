import { Side, type OrderPreview } from '../../../types';
import { OrderType } from '../types';
import { POLYMARKET_V1_PROTOCOL, POLYMARKET_V2_PROTOCOL } from './definitions';
import {
  buildProtocolUnsignedOrder,
  encodeUnwrap,
  encodeWrap,
  getPreviewFeeRateBpsForProtocol,
  getProtocolOrderTypedData,
  getProtocolVerifyingContract,
  serializeProtocolRelayerOrder,
} from './orderCodec';

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

describe('polymarket protocol order codec', () => {
  const protocolV2 = {
    ...POLYMARKET_V2_PROTOCOL,
    order: {
      ...POLYMARKET_V2_PROTOCOL.order,
      getBuilderCode: () =>
        '0x3333333333333333333333333333333333333333333333333333333333333333',
    },
  };

  it('builds a v1 order with v1-only fields', () => {
    const order = buildProtocolUnsignedOrder({
      protocol: POLYMARKET_V1_PROTOCOL,
      preview,
      makerAddress: '0x1111111111111111111111111111111111111111',
      signerAddress: '0x2222222222222222222222222222222222222222',
      nowInSeconds: 123,
    });

    expect(order).toHaveProperty('taker');
    expect(order).toHaveProperty('nonce', '0');
    expect(order).toHaveProperty('feeRateBps', '77');
    expect(order).not.toHaveProperty('metadata');
    expect(order).not.toHaveProperty('builder');
  });

  it('builds a v2 order with timestamp, metadata, and builder', () => {
    const order = buildProtocolUnsignedOrder({
      protocol: protocolV2,
      preview,
      makerAddress: '0x1111111111111111111111111111111111111111',
      signerAddress: '0x2222222222222222222222222222222222222222',
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

  it('builds v2 typed data with domain version 2 and bytes32 fields', () => {
    const order = buildProtocolUnsignedOrder({
      protocol: protocolV2,
      preview,
      makerAddress: '0x1111111111111111111111111111111111111111',
      signerAddress: '0x2222222222222222222222222222222222222222',
      nowInSeconds: 456,
    });

    const typedData = getProtocolOrderTypedData({
      protocol: protocolV2,
      order,
      verifyingContract: getProtocolVerifyingContract({
        protocol: protocolV2,
        negRisk: true,
      }),
    });

    expect(typedData.domain.version).toBe('2');
    expect(typedData.domain.verifyingContract).toBe(
      protocolV2.contracts.negRiskExchange,
    );
    expect(typedData.types.Order).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'metadata', type: 'bytes32' }),
        expect.objectContaining({ name: 'builder', type: 'bytes32' }),
      ]),
    );
  });

  it('serializes signed orders into the relayer body shape', () => {
    const order = buildProtocolUnsignedOrder({
      protocol: protocolV2,
      preview,
      makerAddress: '0x1111111111111111111111111111111111111111',
      signerAddress: '0x2222222222222222222222222222222222222222',
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
  });

  it('forces preview fee rate to zero under v2', () => {
    expect(
      getPreviewFeeRateBpsForProtocol({
        protocol: protocolV2,
        preview,
      }),
    ).toBe('0');

    expect(
      getPreviewFeeRateBpsForProtocol({
        protocol: POLYMARKET_V1_PROTOCOL,
        preview,
      }),
    ).toBe('77');
  });

  it('encodes wrap and unwrap calls', () => {
    expect(
      encodeWrap({
        asset: protocolV2.collateral.legacyUsdceToken,
        to: '0x1111111111111111111111111111111111111111',
        amount: 42n,
      }),
    ).toMatch(/^0x[0-9a-f]+$/u);

    expect(
      encodeUnwrap({
        asset: protocolV2.collateral.legacyUsdceToken,
        to: '0x1111111111111111111111111111111111111111',
        amount: 42n,
      }),
    ).toMatch(/^0x[0-9a-f]+$/u);
  });
});
