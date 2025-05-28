import { PreferencesState } from '@metamask/preferences-controller';
import { CHAIN_IDS, TransactionMeta, TransactionStatus, TransactionType } from '@metamask/transaction-controller';
import { createMockInternalAccount, createMockUuidFromAddress } from '../../accountsControllerTestUtils';
import { backgroundState } from '../../initial-root-state';
import { mockNetworkState } from '../../network';

const MOCK_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_TOKEN_CONTRACT = '0xae2eee9Bd39cbcf2ceC908D053A3e0bC970b8889';
const expectedUuid = createMockUuidFromAddress(
  MOCK_ADDRESS.toLowerCase(),
);
const internalAccount1 = createMockInternalAccount(
  MOCK_ADDRESS.toLowerCase(),
  'Account 1',
);

const MOCK_TOKEN_ID = '12345';

const mockTransactionNft = {
  id: '123-345-678',
  type: TransactionType.tokenMethodTransfer,
  txParams: {
    data: `0x23b872dd000000000000000000000000${MOCK_ADDRESS.slice(2)}000000000000000000000000${MOCK_ADDRESS_TOKEN_CONTRACT.slice(2)}000000000000000000000000000000000000000000000000000000000${MOCK_TOKEN_ID}`,
    from: MOCK_ADDRESS,
    to: MOCK_ADDRESS_TOKEN_CONTRACT,
    value: '0x01',
  },
  chainId: '0x1' as `0x${string}`,
  gas: '0xfa78',
  networkClientId: 'mainnet',
  maxFeePerGas: '0x59b4beea',
  maxPriorityFeePerGas: '0x59682f00',
  status: TransactionStatus.unapproved,
  time: Date.now(),
  origin: 'https://metamask.github.io',
} as Partial<TransactionMeta>;

export const MOCK_STATE_NFT = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            [expectedUuid]: internalAccount1,
          },
          selectedAccount: expectedUuid,
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS]: { balance: '0' },
          },
        },
      },
      PreferencesController: {
        useNftDetection: true,
        displayNftMedia: true,
      } as Partial<PreferencesState>,
      NftController: {
        allNfts: {
          [MOCK_ADDRESS]: {
            '0x1': [{
              address: MOCK_ADDRESS_TOKEN_CONTRACT,
              tokenId: '1',
              favorite: false,
              isCurrentlyOwned: true,
              name: 'Test Dapp NFTs #1',
              description: 'Test Dapp NFTs for testing.',
              image: undefined,
            }, {
              address: MOCK_ADDRESS_TOKEN_CONTRACT,
              tokenId: MOCK_TOKEN_ID,
              favorite: false,
              isCurrentlyOwned: true,
              name: `Test Dapp NFTs #${MOCK_TOKEN_ID}`,
              description: 'Test Dapp NFTs for testing.',
              image: undefined,
            }],
          },
        },
        allNftContracts: {
          [MOCK_ADDRESS]: {
            '0x1': [],
          },
        },
      },
      TransactionController: {
        transactions: [mockTransactionNft],
      },
    },
  },
};
