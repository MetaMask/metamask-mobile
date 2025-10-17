import { device } from 'detox';
import { RelayStatus } from '../../../app/util/transactions/transaction-relay';

const SENDER_ADDRESS_MOCK = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
const RECIPIENT_ADDRESS_MOCK = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const UUID = '1234-5678';
const TRANSACTION_HASH =
  '0xf25183af3bf64af01e9210201a2ede3c1dcd6d16091283152d13265242939fc4';

const SENTINEL_URL = 'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io';
const LOCALHOST_SENTINEL_URL =
  device.getPlatform() === 'android'
    ? 'https://tx-sentinel-127.0.0.1.api.cx.metamask.io/'
    : 'https://tx-sentinel-localhost.api.cx.metamask.io/';

export const SEND_ETH_TRANSACTION_MOCK = {
  data: '0x',
  from: SENDER_ADDRESS_MOCK,
  to: RECIPIENT_ADDRESS_MOCK,
  value: '0xde0b6B3a7640000',
};

export const TRANSACTION_RELAY_SUBMIT_NETWORKS_MOCK = {
  urlEndpoint: `${LOCALHOST_SENTINEL_URL}`,
  responseCode: 200,
  response: {
    jsonrpc: '2.0',
    result: {
      uuid: UUID,
    },
  },
};

export const TRANSACTION_RELAY_STATUS_NETWORKS_MOCK = {
  urlEndpoint: `${SENTINEL_URL}/smart-transactions/${UUID}`,
  responseCode: 200,
  response: {
    transactions: [
      {
        hash: TRANSACTION_HASH,
        status: RelayStatus.Success,
      },
    ],
  },
};
