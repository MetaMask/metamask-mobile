import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { createEncryptedResponse } from '../utils/user-storage/generateEncryptedData';
import { IDENTITY_TEAM_STORAGE_KEY } from '../utils/constants';

/**
 * This array represents the accounts mock data before it is encrypted and sent to UserStorage.
 * Each object within the array represents a UserStorageAccount, which includes properties such as:
 * - v: The version of the User Storage.
 * - a: The address of the account.
 * - i: The id of the account.
 * - n: The name of the account.
 * - nlu: The name last updated timestamp of the account.
 */
export const accountsToMockForAccountsSync = [
  {
    v: '1',
    a: '0xAa4179E7f103701e904D27DF223a39Aa9c27405a'.toLowerCase(),
    i: '0000-1111',
    n: 'Hello from account 1',
    nlu: 1738590287,
  },
  {
    v: '1',
    a: '0xd2a4aFe5c2fF0a16Bf81F77ba4201A8107AA874b'.toLowerCase(),
    i: '1111-1111',
    n: 'Hello from account 2',
    nlu: 1738590287,
  },
];

/**
 * Generates a mock response for account synchronization.
 *
 * This function asynchronously creates an encrypted mock response for each account
 * in the `accountsToMockForAccountsSync` array. The encrypted responses are created
 * using the `createEncryptedMockResponse` function, which takes a configuration object
 * containing the account data, a storage key, and a feature key.
 *
 * @returns A promise that resolves to an array of encrypted mock responses.
 */
export const getAccountsSyncMockResponse = async () => {
  const encryptedResponse = await Promise.all(
    accountsToMockForAccountsSync.map((account) =>
      createEncryptedResponse({
        data: account,
        storageKey: IDENTITY_TEAM_STORAGE_KEY,
        path: `${USER_STORAGE_FEATURE_NAMES.accounts}.${account.a}`,
      }),
    ),
  );

  return encryptedResponse;
};

export const MOCK_NETWORK_CONTROLLER_STATE = {
  networkConfigurationsByChainId: {
    '0xaa36a7': {
      blockExplorerUrls: [],
      chainId: '0xaa36a7',
      defaultRpcEndpointIndex: 0,
      name: 'Sepolia',
      nativeCurrency: 'SepoliaETH',
      rpcEndpoints: [
        {
          failoverUrls: [],
          networkClientId: 'sepolia',
          type: 'infura',
          url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0x18c6': {
      blockExplorerUrls: ['https://megaexplorer.xyz'],
      chainId: '0x18c6',
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: 0,
      name: 'Mega Testnet',
      nativeCurrency: 'MegaETH',
      rpcEndpoints: [
        {
          failoverUrls: [],
          networkClientId: 'megaeth-testnet',
          type: 'custom',
          url: 'https://carrot.megaeth.com/rpc',
        },
      ],
    },
  },
};

export const MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE = {
  isEvmSelected: true,
  multichainNetworkConfigurationsByChainId: {
    'bip122:000000000019d6689c085ae165831e93': {
      chainId: 'bip122:000000000019d6689c085ae165831e93',
      isEvm: false,
      name: 'Bitcoin Mainnet',
      nativeCurrency: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      isEvm: false,
      name: 'Solana Mainnet',
      nativeCurrency:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
  },
  selectedMultichainNetworkChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export const MOCK_ACCOUNT_CONTROLLER_STATE = {
  internalAccounts: {
    accounts: {
      '94b520b3-a0c9-4cbd-a689-441a01630331': {
        id: '94b520b3-a0c9-4cbd-a689-441a01630331',
        address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        scopes: ['eip155:0'],
        type: 'eip155:eoa',
        metadata: {
          name: 'Account 1',
          importTime: 1746181774143,
          keyring: { type: 'HD Key Tree' },
          lastSelected: 1746191007939,
        },
      },
      '023043ce-6c62-4cab-bf91-8939553a68f2': {
        id: '023043ce-6c62-4cab-bf91-8939553a68f2',
        address: '0x089595380921f555d52ab6f5a49defdaab23b444',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        scopes: ['eip155:0'],
        type: 'eip155:eoa',
        metadata: {
          name: 'Account 2',
          importTime: 1746181776738,
          keyring: { type: 'HD Key Tree' },
          lastSelected: 0,
        },
      },
      '3fb381cd-76e5-4edb-81f4-b5133b115a8e': {
        id: '3fb381cd-76e5-4edb-81f4-b5133b115a8e',
        address: '0xa4a80ce0afdfb8e6bd1221d3b18a1653eee6d19d',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        scopes: ['eip155:0'],
        type: 'eip155:eoa',
        metadata: {
          name: 'Account 3',
          importTime: 1746181779759,
          keyring: { type: 'HD Key Tree' },
          lastSelected: 0,
        },
      },
    },
    selectedAccount: '94b520b3-a0c9-4cbd-a689-441a01630331',
  },
};

export const MOCK_KEYRING_CONTROLLER_STATE = {
  encryptionKey:
    'eyJrZXkiOiI4MWJlNTI4ZmE5YjNjZWYyYzhlNjRjZDYzZGUzZWNiMjI3MDZiYjkxNWVjZDA2N2YzNTI0MmIzNjUzMTA3ZDNlIiwia2V5TWV0YWRhdGEiOnsiYWxnb3JpdGhtIjoiUEJLREYyIiwicGFyYW1zIjp7Iml0ZXJhdGlvbnMiOjUwMDB9fSwiZXhwb3J0YWJsZSI6dHJ1ZSwibGliIjoib3JpZ2luYWwifQ==',
  encryptionSalt: '8kIQmE68v/69QfTev/LYgK6EuEkwFVd1zq+nJKc6vAQ=',
  isUnlocked: true,
  keyrings: [
    { accounts: [Array], type: 'HD Key Tree' },
    { accounts: [Array], type: 'QR Hardware Wallet Device' },
  ],
  keyringsMetadata: [
    { id: '01JT88PPSFQW1C2SGPKTS874ZX', name: '' },
    { id: '01JT88PSBXWQ36YBFJWHJAC9T2', name: '' },
  ],
  vault:
    '{"cipher":"JJm0oiUlVsTTbh3t3iTmyMG2ZypYuagmL1iAKr4Q1d1Jd9MLI5ngq3R9nn4YILl9eTBhWq5bL+7E85LIVK+erMM4OTJo/uZsMB+8eNUDMHBPvxB0XgoTzgNe75UCclLh+xfHYvHjNutmbt/OzL8slaAcrFW/e+KEHfN9YT4cI5i1aFaC4HYFw2Zf05jdTMnDMBHsrf3ArCeYhnVq5pMWgMrNpCz1+7/SYkSkF4hlPAwUBMT7gxVMBApk4mTXS38lEcBYGR2TORaNVpYX1WUsX7/1MbIj1B2vmHNz9UJWFujuodOxQ1EzjEpFLgJ/FykEAVeLUW8NAhZldn7tZWfgsxppVlMcTpn7V7/kSxAic6wRwRwhrFB7Rz+0h0VFmPVrs6Su2QmEetAptdxfOeb583dvrhfj0NRo4d9IMvIBfgey92gvAvim9pkrmtH9K6+FQ23gCcwXrnC0B/pSO9y1ONc9CflmGlo/o4TP+B5Mw+dBoFBOQ+zuOL/YLFEgyDiDVLhyxrm4JFHcprfg5Sejpd28Z7myx9IA+L7WYHamTZLr090rD8dT7DydW3vQXZjMA8lFSVjhixwN6HE1tXrADzWtzf+1hfOUFezWLrgqYmmojzUq/BtFvmt4cQeAgPMfTcbF1NXEth41ghBsYrjxr8XcGJ7WL7dp1umMUCVofhCgW1CR9rvEC0p8fqdDaWEgokJgOPxG69ueOf2FlQwlW7hKFHiYDad3H63JW2cEGdamkqjAwTY/4cQ/m+im0ai3tsgjmlXr9k43dwEl1dNOHhp/ICTzZKZXxWyXlI1ZjokrzUz1zawdVuj8fujvnXPPlvyEYGMMg2HamJltbnnoXA==","iv":"23ac7cbac25da7618b302ee6b4ae3698","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"8kIQmE68v/69QfTev/LYgK6EuEkwFVd1zq+nJKc6vAQ="}',
};
