import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { onUnapprovedTransaction } from './onUnapprovedTransaction';
import { isHardwareAccount } from '../../../util/address';

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

const isHardwareAccountMock = jest.mocked(isHardwareAccount);

// Real swap contract address on mainnet (from @metamask/bridge-controller ALLOWED_CONTRACT_ADDRESSES)
const SWAP_CONTRACT_ADDRESS = '0x881d40237659c251811cec9c364ef91dc08d300c';

// Real swap tx data from existing test fixtures (not a transfer signature)
const SWAP_TX_DATA =
  '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000c0';

const mockCallbacks = () => ({
  autoSign: jest.fn(),
});

const buildSwapTxMeta = (overrides: Partial<TransactionMeta> = {}) =>
  ({
    origin: ORIGIN_METAMASK,
    type: TransactionType.swap,
    chainId: '0x1',
    txParams: {
      from: '0xFromAddress',
      to: SWAP_CONTRACT_ADDRESS,
      data: SWAP_TX_DATA,
    },
    ...overrides,
  }) as unknown as TransactionMeta;

const buildBridgeTxMeta = (overrides: Partial<TransactionMeta> = {}) =>
  ({
    origin: ORIGIN_METAMASK,
    type: TransactionType.bridge,
    chainId: '0x1',
    txParams: {
      from: '0xFromAddress',
      to: '0xBridgeContractAddress',
      data: '0x',
    },
    ...overrides,
  }) as unknown as TransactionMeta;

const buildSimpleSendTxMeta = () =>
  ({
    origin: 'https://some-dapp.com',
    type: TransactionType.simpleSend,
    chainId: '0x1',
    txParams: {
      from: '0xFromAddress',
      to: '0xRecipient',
      data: undefined,
    },
  }) as unknown as TransactionMeta;

describe('onUnapprovedTransaction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('skips processing when origin is MetaMask Mobile (MMM)', () => {
    const callbacks = mockCallbacks();
    const txMeta = buildSwapTxMeta({ origin: 'MetaMask Mobile' });

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).not.toHaveBeenCalled();
  });

  it('calls autoSign for hardware wallet swap', () => {
    isHardwareAccountMock.mockReturnValue(true);
    const callbacks = mockCallbacks();
    const txMeta = buildSwapTxMeta();

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).toHaveBeenCalledTimes(1);
  });

  it('does not call autoSign for software wallet swap', () => {
    isHardwareAccountMock.mockReturnValue(false);
    const callbacks = mockCallbacks();
    const txMeta = buildSwapTxMeta();

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).not.toHaveBeenCalled();
  });

  it('calls autoSign for hardware wallet bridge', () => {
    isHardwareAccountMock.mockReturnValue(true);
    const callbacks = mockCallbacks();
    const txMeta = buildBridgeTxMeta();

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).toHaveBeenCalledTimes(1);
  });

  it('does not call autoSign for software wallet bridge', () => {
    isHardwareAccountMock.mockReturnValue(false);
    const callbacks = mockCallbacks();
    const txMeta = buildBridgeTxMeta();

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).not.toHaveBeenCalled();
  });

  it('calls autoSign for hardware wallet bridgeApproval', () => {
    isHardwareAccountMock.mockReturnValue(true);
    const callbacks = mockCallbacks();
    const txMeta = buildBridgeTxMeta({ type: TransactionType.bridgeApproval });

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).toHaveBeenCalledTimes(1);
  });

  it('does not call autoSign for non-swap non-bridge transaction', () => {
    isHardwareAccountMock.mockReturnValue(false);
    const callbacks = mockCallbacks();
    const txMeta = buildSimpleSendTxMeta();

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).not.toHaveBeenCalled();
  });

  it('does not call autoSign for non-swap non-bridge transaction even from hardware wallet', () => {
    isHardwareAccountMock.mockReturnValue(true);
    const callbacks = mockCallbacks();
    const txMeta = buildSimpleSendTxMeta();

    onUnapprovedTransaction(txMeta, callbacks);

    expect(callbacks.autoSign).not.toHaveBeenCalled();
  });

  it('does not mutate the original transaction meta', () => {
    isHardwareAccountMock.mockReturnValue(false);
    const callbacks = mockCallbacks();
    const txMeta = buildSwapTxMeta();
    const originalTo = txMeta.txParams.to;

    onUnapprovedTransaction(txMeta, callbacks);

    expect(txMeta.txParams.to).toBe(originalTo);
  });
});
