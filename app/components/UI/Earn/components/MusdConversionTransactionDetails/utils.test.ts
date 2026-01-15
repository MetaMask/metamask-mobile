import { Hex } from '@metamask/utils';
import { getConversionTransfersFromLogs } from './utils';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
  },
}));

const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const MOCK_TX_HASH =
  '0xed9cb42a9d390bb2b9a5c6aecc8f1e62d59cfa9a350c507272f1ba0c248ca237';
const MOCK_CHAIN_ID = '0xe708' as Hex; // Linea Mainnet

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

describe('getConversionTransfersFromLogs', () => {
  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );
  const mockGetNetworkClientById = jest.mocked(
    Engine.context.NetworkController.getNetworkClientById,
  );

  const mockRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindNetworkClientIdByChainId.mockReturnValue('linea-mainnet');
    mockGetNetworkClientById.mockReturnValue({
      provider: { request: mockRequest },
    } as unknown as ReturnType<typeof mockGetNetworkClientById>);
  });

  it('returns first and last transfers from receipt logs', async () => {
    const inputAmount = '0x4e46'; // 20038 in decimal
    const outputAmount = '0x5087'; // 20615 in decimal

    mockRequest.mockResolvedValue({
      logs: [
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
      ],
    });

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

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

    expect(mockRequest).toHaveBeenCalledWith({
      method: 'eth_getTransactionReceipt',
      params: [MOCK_TX_HASH],
    });
  });

  it('returns null for input and output when no network client found', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue(undefined);

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns null for input and output when no provider', async () => {
    mockGetNetworkClientById.mockReturnValue({
      provider: undefined,
    } as unknown as ReturnType<typeof mockGetNetworkClientById>);

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('returns null for input and output when no receipt', async () => {
    mockRequest.mockResolvedValue(null);

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('returns null for input and output when receipt has no logs', async () => {
    mockRequest.mockResolvedValue({ logs: undefined });

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('returns null for input and output when logs array is empty', async () => {
    mockRequest.mockResolvedValue({ logs: [] });

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('filters out non-Transfer event logs', async () => {
    const transferAmount = '0x5087';
    const nonTransferTopic =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    mockRequest.mockResolvedValue({
      logs: [
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
      ],
    });

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    // Only the Transfer event should be captured
    expect(result.input).toStrictEqual({
      from: MOCK_FROM_ADDRESS.toLowerCase(),
      to: MOCK_TO_ADDRESS.toLowerCase(),
      amount: '20615',
      tokenContract: MOCK_MUSD_ADDRESS,
    });
    expect(result.output).toStrictEqual(result.input);
  });

  it('returns same transfer for input and output when single transfer', async () => {
    const singleAmount = '0x5087';

    mockRequest.mockResolvedValue({
      logs: [
        createTransferLog(
          MOCK_MUSD_ADDRESS,
          MOCK_FROM_ADDRESS,
          MOCK_TO_ADDRESS,
          singleAmount,
        ),
      ],
    });

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result.input).toStrictEqual(result.output);
    expect(result.input?.amount).toBe('20615');
  });

  it('returns null for input and output on provider error', async () => {
    mockRequest.mockRejectedValue(new Error('RPC error'));

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
  });

  it('handles logs with insufficient topics', async () => {
    mockRequest.mockResolvedValue({
      logs: [
        {
          address: MOCK_MUSD_ADDRESS,
          topics: [TRANSFER_EVENT_TOPIC], // Missing from and to topics
          data: '0x5087',
        },
      ],
    });

    const result = await getConversionTransfersFromLogs(
      MOCK_TX_HASH,
      MOCK_CHAIN_ID,
    );

    expect(result).toStrictEqual({ input: null, output: null });
  });
});
