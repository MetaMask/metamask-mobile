import { Interface } from 'ethers/lib/utils';
import { MATIC_CONTRACTS_V2, POLYGON_MAINNET_CHAIN_ID } from '../constants';
import { SAFE_FACTORY_ADDRESS, SAFE_MULTISEND_ADDRESS } from './constants';
import {
  aggregateTransaction,
  computeProxyAddress,
  createPermit2FeeAuthorization,
  getDeployProxyWalletTypedData,
  getSafeTransferAmount,
  getSafeTransferAmountRaw,
} from './utils';
import { OperationType, type SafeTransaction } from './types';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
  },
}));

const signer = {
  address: '0x1111111111111111111111111111111111111111',
  signTypedMessage: jest.fn(),
  signPersonalMessage: jest.fn(),
};

const validSignature = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b`;

describe('safe utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signer.signPersonalMessage.mockResolvedValue(validSignature);
    jest.spyOn(global.crypto, 'getRandomValues').mockImplementation((array) => {
      if (array instanceof Uint32Array) {
        array[0] = 7;
      }
      return array;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('computes a deterministic proxy address', () => {
    expect(computeProxyAddress(signer.address)).toMatch(/^0x[0-9a-fA-F]{40}$/u);
    expect(computeProxyAddress(signer.address)).toBe(
      computeProxyAddress(signer.address),
    );
  });

  it('builds deploy proxy typed data for Polygon', () => {
    const typedData = getDeployProxyWalletTypedData();

    expect(typedData.domain).toEqual({
      name: 'Polymarket Contract Proxy Factory',
      chainId: `0x${POLYGON_MAINNET_CHAIN_ID.toString(16)}`,
      verifyingContract: SAFE_FACTORY_ADDRESS,
    });
    expect(typedData.primaryType).toBe('CreateProxy');
  });

  it('creates pUSD Permit2 fee authorization by default', async () => {
    const authorization = await createPermit2FeeAuthorization({
      safeAddress: '0x9999999999999999999999999999999999999999',
      signer,
      amount: 123n,
      spender: '0x2222222222222222222222222222222222222222',
    });

    expect(authorization.type).toBe('safe-permit2');
    expect(authorization.authorization.permit.permitted).toEqual({
      token: MATIC_CONTRACTS_V2.collateral,
      amount: '123',
    });
    expect(authorization.authorization.spender).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(authorization.authorization.signature).toMatch(/^0x[0-9a-f]+$/u);
  });

  it('aggregates multiple transactions into a multisend delegatecall', () => {
    const transactions: SafeTransaction[] = [
      {
        to: '0x1111111111111111111111111111111111111111',
        data: '0x1234',
        operation: OperationType.Call,
        value: '0',
      },
      {
        to: '0x2222222222222222222222222222222222222222',
        data: '0xabcd',
        operation: OperationType.Call,
        value: '0',
      },
    ];

    expect(aggregateTransaction(transactions)).toEqual(
      expect.objectContaining({
        to: SAFE_MULTISEND_ADDRESS,
        operation: OperationType.DelegateCall,
        value: '0',
      }),
    );
  });

  it('keeps a single transaction unwrapped during aggregation', () => {
    const transaction: SafeTransaction = {
      to: '0x1111111111111111111111111111111111111111',
      data: '0x1234',
      operation: OperationType.Call,
      value: '0',
    };

    expect(aggregateTransaction([transaction])).toBe(transaction);
  });

  it('decodes ERC20 transfer amounts from Safe editable calldata', () => {
    const calldata = new Interface([
      'function transfer(address to, uint256 value)',
    ]).encodeFunctionData('transfer', [signer.address, 1_500_000]);

    expect(getSafeTransferAmountRaw(calldata)).toBe(1_500_000n);
    expect(getSafeTransferAmount(calldata)).toBe(1.5);
  });

  it('rejects non-transfer calldata when decoding amounts', () => {
    expect(() => getSafeTransferAmountRaw('0x12345678')).toThrow(
      'Not an ERC20 transfer call',
    );
  });
});
