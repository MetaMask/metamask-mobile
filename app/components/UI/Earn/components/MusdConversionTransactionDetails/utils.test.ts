import { TransactionMeta } from '@metamask/transaction-controller';
import { getConversionTransfersFromLogs } from './utils';

const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const MOCK_FROM_ADDRESS = '0x113a327206552f8a89f98af5f9b0b69019a4ad1a';
const MOCK_TO_ADDRESS = '0x316bde155acd07609872a56bc32ccfb0b13201fa';
const MOCK_USDC_ADDRESS = '0xa219439258ca9da29e9cc4ce5596924745e12b93';
const MOCK_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

// Padded addresses for event topics (32 bytes)
const padAddress = (address: string) =>
  '0x' + address.slice(2).toLowerCase().padStart(64, '0');

const createTransferLog = (
  tokenContract: string,
  from: string,
  to: string,
  amount: string,
) => ({
  address: tokenContract,
  topics: [TRANSFER_EVENT_TOPIC, padAddress(from), padAddress(to)],
  data: amount,
});

const createMockTransactionMeta = (
  txReceiptLogs: unknown[] | undefined,
): TransactionMeta =>
  ({
    id: 'test-tx-id',
    chainId: '0xe708',
    hash: '0xed9cb42a9d390bb2b9a5c6aecc8f1e62d59cfa9a350c507272f1ba0c248ca237',
    networkClientId: 'linea-mainnet',
    status: 'confirmed',
    time: Date.now(),
    txParams: { from: '0x0', to: '0x0' },
    txReceipt: txReceiptLogs ? { logs: txReceiptLogs } : undefined,
  }) as TransactionMeta;

describe('getConversionTransfersFromLogs', () => {
  it('returns first and last transfers from receipt logs', () => {
    const inputAmount = '0x4e46'; // 20038 in decimal
    const outputAmount = '0x5087'; // 20615 in decimal

    const mockTx = createMockTransactionMeta([
      createTransferLog(
        MOCK_USDC_ADDRESS,
        MOCK_FROM_ADDRESS,
        MOCK_TO_ADDRESS,
        inputAmount,
      ),
      createTransferLog(
        MOCK_MUSD_ADDRESS,
        MOCK_FROM_ADDRESS,
        MOCK_TO_ADDRESS,
        outputAmount,
      ),
    ]);

    const result = getConversionTransfersFromLogs(mockTx);

    expect(result.input).toStrictEqual({
      from: MOCK_FROM_ADDRESS.toLowerCase(),
      to: MOCK_TO_ADDRESS.toLowerCase(),
      amount: '20038',
      tokenContract: MOCK_USDC_ADDRESS,
    });

    expect(result.output).toStrictEqual({
      from: MOCK_FROM_ADDRESS.toLowerCase(),
      to: MOCK_TO_ADDRESS.toLowerCase(),
      amount: '20615',
      tokenContract: MOCK_MUSD_ADDRESS,
    });
  });

  it('returns null for input and output when transaction is undefined', () => {
    const result = getConversionTransfersFromLogs(undefined);

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('returns null for input and output when receipt has no logs', () => {
    const mockTx = createMockTransactionMeta(undefined);

    const result = getConversionTransfersFromLogs(mockTx);

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('returns null for input and output when logs array is empty', () => {
    const mockTx = createMockTransactionMeta([]);

    const result = getConversionTransfersFromLogs(mockTx);

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('filters out non-Transfer event logs', () => {
    const transferAmount = '0x5087';
    const nonTransferTopic =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const mockTx = createMockTransactionMeta([
      {
        address: '0xsomecontract',
        topics: [nonTransferTopic, padAddress(MOCK_FROM_ADDRESS)],
        data: '0x1234',
      },
      createTransferLog(
        MOCK_MUSD_ADDRESS,
        MOCK_FROM_ADDRESS,
        MOCK_TO_ADDRESS,
        transferAmount,
      ),
    ]);

    const result = getConversionTransfersFromLogs(mockTx);

    // Only the Transfer event is captured
    expect(result.input).toStrictEqual({
      from: MOCK_FROM_ADDRESS.toLowerCase(),
      to: MOCK_TO_ADDRESS.toLowerCase(),
      amount: '20615',
      tokenContract: MOCK_MUSD_ADDRESS,
    });
    expect(result.output).toStrictEqual(result.input);
  });

  it('returns same transfer for input and output when single transfer', () => {
    const singleAmount = '0x5087';

    const mockTx = createMockTransactionMeta([
      createTransferLog(
        MOCK_MUSD_ADDRESS,
        MOCK_FROM_ADDRESS,
        MOCK_TO_ADDRESS,
        singleAmount,
      ),
    ]);

    const result = getConversionTransfersFromLogs(mockTx);

    expect(result.input).toStrictEqual(result.output);
    expect(result.input?.amount).toBe('20615');
  });

  it('handles logs with insufficient topics', () => {
    const mockTx = createMockTransactionMeta([
      {
        address: MOCK_MUSD_ADDRESS,
        topics: [TRANSFER_EVENT_TOPIC], // Missing from and to topics
        data: '0x5087',
      },
    ]);

    const result = getConversionTransfersFromLogs(mockTx);

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('handles logs with null or undefined values', () => {
    const mockTx = createMockTransactionMeta([
      {
        address: null,
        topics: [
          TRANSFER_EVENT_TOPIC,
          padAddress(MOCK_FROM_ADDRESS),
          padAddress(MOCK_TO_ADDRESS),
        ],
        data: null,
      },
    ]);

    const result = getConversionTransfersFromLogs(mockTx);

    expect(result.input).toStrictEqual({
      from: MOCK_FROM_ADDRESS.toLowerCase(),
      to: MOCK_TO_ADDRESS.toLowerCase(),
      amount: '0',
      tokenContract: '',
    });
  });
});
