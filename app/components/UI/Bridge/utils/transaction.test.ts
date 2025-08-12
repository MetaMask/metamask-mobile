import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getIsBridgeTransaction } from './transaction';

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
