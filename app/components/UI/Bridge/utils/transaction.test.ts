import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { isHardwareAccount } from '../../../../util/address';
import {
  getIsBridgeTransaction,
  isHardwareBridgeTransaction,
} from './transaction';

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

describe('getIsBridgeTransaction', () => {
  it('returns true when origin is MetaMask and type is bridge', () => {
    // Arrange
    const txMeta = {
      origin: ORIGIN_METAMASK,
      type: TransactionType.bridge,
    } as TransactionMeta;

    // Act
    const result = getIsBridgeTransaction(txMeta);

    // Assert
    expect(result).toBe(true);
  });

  it('returns true when origin is MetaMask and type is bridgeApproval', () => {
    // Arrange
    const txMeta = {
      origin: ORIGIN_METAMASK,
      type: TransactionType.bridgeApproval,
    } as TransactionMeta;

    // Act
    const result = getIsBridgeTransaction(txMeta);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when origin is MetaMask but type is not bridge related', () => {
    // Arrange
    const txMeta = {
      origin: ORIGIN_METAMASK,
      type: TransactionType.contractInteraction,
    } as TransactionMeta;

    // Act
    const result = getIsBridgeTransaction(txMeta);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when origin is not MetaMask but type is bridge', () => {
    // Arrange
    const txMeta = {
      origin: 'https://example.com',
      type: TransactionType.bridge,
    } as TransactionMeta;

    // Act
    const result = getIsBridgeTransaction(txMeta);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when origin is not MetaMask but type is bridgeApproval', () => {
    // Arrange
    const txMeta = {
      origin: 'https://example.com',
      type: TransactionType.bridgeApproval,
    } as TransactionMeta;

    // Act
    const result = getIsBridgeTransaction(txMeta);

    // Assert
    expect(result).toBe(false);
  });
});

describe('isHardwareBridgeTransaction', () => {
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns true when it is a bridge transaction from a hardware wallet', () => {
    isHardwareAccountMock.mockReturnValue(true);

    const txMeta = {
      origin: ORIGIN_METAMASK,
      type: TransactionType.bridge,
      txParams: { from: '0xHardwareAddress' },
    } as unknown as TransactionMeta;

    expect(isHardwareBridgeTransaction(txMeta)).toBe(true);
    expect(isHardwareAccountMock).toHaveBeenCalledWith('0xHardwareAddress');
  });

  it('returns false when it is a bridge transaction but not from a hardware wallet', () => {
    isHardwareAccountMock.mockReturnValue(false);

    const txMeta = {
      origin: ORIGIN_METAMASK,
      type: TransactionType.bridge,
      txParams: { from: '0xSoftwareAddress' },
    } as unknown as TransactionMeta;

    expect(isHardwareBridgeTransaction(txMeta)).toBe(false);
  });

  it('returns false when it is from a hardware wallet but not a bridge transaction', () => {
    isHardwareAccountMock.mockReturnValue(true);

    const txMeta = {
      origin: ORIGIN_METAMASK,
      type: TransactionType.contractInteraction,
      txParams: { from: '0xHardwareAddress' },
    } as unknown as TransactionMeta;

    expect(isHardwareBridgeTransaction(txMeta)).toBe(false);
  });
});
