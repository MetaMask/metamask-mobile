import { KeyringTypes } from '@metamask/keyring-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../util/test/network';
import { NetworkClientId } from '@metamask/network-controller';
import Engine from '../../core/Engine';

export const mockedEngine = {
  init: () => Engine.init({}),
  context: {
    KeyringController: {
      keyring: {
        keyrings: [
          {
            mnemonic:
              'one two three four five six seven eight nine ten eleven twelve',
          },
        ],
      },
      state: {
        keyrings: [
          {
            accounts: ['0xd018538C87232FF95acbCe4870629b75640a78E7'],
            type: KeyringTypes.simple,
          },
          {
            accounts: ['0xB374Ca013934e498e5baD3409147F34E6c462389'],
            type: KeyringTypes.qr,
          },
          {
            accounts: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
            type: KeyringTypes.hd,
          },
        ],
      },
    },
    NetworkController: {
      getNetworkClientById: (networkClientId: NetworkClientId) => {
        if (networkClientId === 'linea_goerli') {
          return {
            configuration: {
              chainId: '0xe704',
              rpcUrl: 'https://linea-goerli.infura.io/v3',
              ticker: 'LINEA',
              type: 'custom',
            },
          };
        }

        return {
          configuration: {
            chainId: '0x1',
            rpcUrl: 'https://mainnet.infura.io/v3',
            ticker: 'ETH',
            type: 'custom',
          },
        };
      },
      state: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
  hasFunds: jest.fn(),
};

export default mockedEngine;
