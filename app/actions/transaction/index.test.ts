import {
  resetTransaction,
  newAssetTransaction,
  setRecipient,
  setSelectedAsset,
  prepareTransaction,
  setTransactionObject,
} from './index';
import TransactionTypes from '../../core/TransactionTypes';

const {
  ASSET: { ETH, ERC20, ERC721 },
} = TransactionTypes;

describe('transaction actions', () => {
  it('should create an action to reset transaction', () => {
    const expectedAction = {
      type: 'RESET_TRANSACTION',
    };
    expect(resetTransaction()).toEqual(expectedAction);
  });
  describe('newAssetTransaction', () => {
    it('should create an action to start a new transaction with an asset isETH', () => {
      const selectedAsset = {
        isETH: true,
      };
      const expectedAction = {
        type: 'NEW_ASSET_TRANSACTION',
        selectedAsset,
        assetType: ETH,
      };
      expect(newAssetTransaction(selectedAsset)).toEqual(expectedAction);
    });

    it('should create an action to start a new transaction with an asset ERC20', () => {
      const selectedAsset = {
        isETH: false,
      };
      const expectedAction = {
        type: 'NEW_ASSET_TRANSACTION',
        selectedAsset,
        assetType: ERC20,
      };
      expect(newAssetTransaction(selectedAsset)).toEqual(expectedAction);
    });

    it('should create an action to start a new transaction with an asset ERC721', () => {
      const selectedAsset = {
        isETH: false,
        tokenId: 1,
      };
      const expectedAction = {
        type: 'NEW_ASSET_TRANSACTION',
        selectedAsset,
        assetType: ERC721,
      };
      expect(newAssetTransaction(selectedAsset)).toEqual(expectedAction);
    });
  });
  it('should create an action to set recipient', () => {
    const from = '0x123';
    const to = '0x456';
    const ensRecipient = 'example.eth';
    const transactionToName = 'John Doe';
    const transactionFromName = 'Jane Doe';
    const expectedAction = {
      type: 'SET_RECIPIENT',
      from,
      to,
      ensRecipient,
      transactionToName,
      transactionFromName,
    };
    expect(
      setRecipient(
        from,
        to,
        ensRecipient,
        transactionToName,
        transactionFromName,
      ),
    ).toEqual(expectedAction);
  });

  describe('setSelectedAsset', () => {
    it('ETH should create an action to set selected asset isETH', () => {
      const selectedAsset = {
        isETH: true,
      };
      const expectedAction = {
        type: 'SET_SELECTED_ASSET',
        selectedAsset,
        assetType: ETH,
      };
      expect(setSelectedAsset(selectedAsset)).toEqual(expectedAction);
    });

    it('should create an action to set selected asset ERC20', () => {
      const selectedAsset = {
        isETH: false,
      };
      const expectedAction = {
        type: 'SET_SELECTED_ASSET',
        selectedAsset,
        assetType: ERC20,
      };
      expect(setSelectedAsset(selectedAsset)).toEqual(expectedAction);
    });

    it('should create an action to set selected asset ERC721', () => {
      const selectedAsset = {
        isETH: false,
        tokenId: 1,
      };
      const expectedAction = {
        type: 'SET_SELECTED_ASSET',
        selectedAsset,
        assetType: ERC721,
      };
      expect(setSelectedAsset(selectedAsset)).toEqual(expectedAction);
    });
  });

  it('should create an action to prepare transaction', () => {
    const transaction = {
      from: '0x123',
      to: '0x456',
      data: '0xabc',
      gas: 100000,
      gasPrice: 1000000000,
      value: 1000000000000000000,
    };
    const expectedAction = {
      type: 'PREPARE_TRANSACTION',
      transaction,
    };
    expect(prepareTransaction(transaction)).toEqual(expectedAction);
  });

  it('should create an action to set transaction object', () => {
    const transaction = {
      from: '0x123',
      to: '0x456',
      data: '0xabc',
      gas: 100000,
      gasPrice: 1000000000,
      value: 1000000000000000000,
    };
    const expectedAction = {
      type: 'SET_TRANSACTION_OBJECT',
      transaction,
    };
    expect(setTransactionObject(transaction)).toEqual(expectedAction);
  });
});
