import { Mockttp } from 'mockttp';
import { setupMockPostRequest } from '../../api-mocking/helpers/mockHelpers';
import { safeGetBodyText } from '../../api-mocking/MockServerE2E';
import { getDecodedProxiedURL } from '../../smoke/notifications/utils/helpers';

const MAINNET_GENESIS_BLOCK = {
  difficulty: '0x400000000',
  extraData:
    '0x11bbe8db4e347b4e8c937c1c8370e4b5ed33adb3db69cbdb7a38e1e50b1b82fa',
  gasLimit: '0x1388',
  gasUsed: '0x0',
  hash: '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
  logsBloom:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  miner: '0x0000000000000000000000000000000000000000',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  nonce: '0x0000000000000042',
  number: '0x0',
  parentHash:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  receiptsRoot:
    '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  sha3Uncles:
    '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  size: '0x21c',
  stateRoot:
    '0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544',
  timestamp: '0x0',
  transactions: [],
  transactionsRoot:
    '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  uncles: [],
};

const LINEA_GENESIS_BLOCK = {
  number: '0x0',
  hash: '0xb6762a65689107b2326364aefc18f94cda413209fab35c00d4af51eaa20ffbc6',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  parentHash:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  nonce: '0x0000000000000000',
  sha3Uncles:
    '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  logsBloom:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  transactionsRoot:
    '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  stateRoot:
    '0x716659ad8045834538750b4c0885b6759b6b096e14a0ccda4e301e49de97987f',
  receiptsRoot:
    '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  miner: '0x0000000000000000000000000000000000000000',
  difficulty: '0x1',
  totalDifficulty: '0x1',
  extraData:
    '0x00000000000000000000000000000000000000000000000000000000000000008f81e2e3f8b46467523463835f965ffe476e1c9e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  baseFeePerGas: '0x8',
  size: '0x274',
  gasLimit: '0x3a2c940',
  gasUsed: '0x0',
  timestamp: '0x6391bff3',
  uncles: [],
  transactions: [],
};

const SEPOLIA_GENESIS_BLOCK = {
  baseFeePerGas: '0x3b9aca00',
  difficulty: '0x20000',
  extraData:
    '0x5365706f6c69612c20417468656e732c204174746963612c2047726565636521',
  gasLimit: '0x1c9c380',
  gasUsed: '0x0',
  hash: '0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9',
  logsBloom:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  miner: '0x0000000000000000000000000000000000000000',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  nonce: '0x0000000000000000',
  number: '0x0',
  parentHash:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  receiptsRoot:
    '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  sha3Uncles:
    '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  size: '0x225',
  stateRoot:
    '0x5eb6e371a698b8d68f665192350ffcecbbbf322916f4b51bd79bb6887da3f494',
  timestamp: '0x6159af19',
  transactions: [],
  transactionsRoot:
    '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  uncles: [],
};

interface InfuraChainRpcConfig {
  netVersion: string;
  chainId: string;
  genesisBlock: Record<string, unknown>;
}

function jsonRpcResultForMethod(
  method: string | undefined,
  config: InfuraChainRpcConfig,
): unknown {
  switch (method) {
    case 'eth_getBlockByNumber':
      return config.genesisBlock;
    case 'eth_blockNumber':
      return '0x1234567';
    case 'net_version':
      return config.netVersion;
    case 'eth_chainId':
      return config.chainId;
    case 'eth_call':
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    case 'eth_getBalance':
      return '0x0';
    case 'eth_getTransactionCount':
      return '0x0';
    case 'eth_gasPrice':
      return '0x3b9aca00';
    case 'eth_estimateGas':
      return '0x5208';
    default:
      return '0x';
  }
}

/**
 * Intercepts all JSON-RPC POSTs to a proxied Infura URL so newer client traffic
 * (eth_call, eth_blockNumber, net_version, etc.) is answered instead of only
 * eth_getBlockByNumber — strict single-method mocks caused validation noise and
 * timeouts when the app added more RPC calls.
 */
async function setupInfuraChainJsonRpcMock(
  mockServer: Mockttp,
  urlRegex: RegExp,
  config: InfuraChainRpcConfig,
): Promise<void> {
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);
      return urlRegex.test(decodedUrl);
    })
    .asPriority(999)
    .thenCallback(async (request) => {
      const requestBodyText = await safeGetBodyText(request);
      if (!requestBodyText) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            result: null,
          }),
        };
      }

      let body: unknown;
      try {
        body = JSON.parse(requestBodyText);
      } catch {
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            result: '0x',
          }),
        };
      }

      if (Array.isArray(body)) {
        const results = body.map(
          (req: { id?: number | string; method?: string }) => ({
            id: req.id ?? 1,
            jsonrpc: '2.0' as const,
            result: jsonRpcResultForMethod(req.method, config),
          }),
        );
        return { statusCode: 200, body: JSON.stringify(results) };
      }

      const single = body as { id?: number | string; method?: string };
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: single.id ?? 1,
          jsonrpc: '2.0',
          result: jsonRpcResultForMethod(single.method, config),
        }),
      };
    });
}

/**
 * Mock real genesis blocks for the chains to not require hitting the network.
 *
 * @param mockServer - The mock server.
 */
export async function mockGenesisBlocks(mockServer: Mockttp) {
  await setupInfuraChainJsonRpcMock(
    mockServer,
    /^https:\/\/mainnet\.infura\.io\/v3*/u,
    {
      netVersion: '1',
      chainId: '0x1',
      genesisBlock: MAINNET_GENESIS_BLOCK,
    },
  );

  await setupInfuraChainJsonRpcMock(
    mockServer,
    /^https:\/\/linea-mainnet\.infura\.io\/v3*/u,
    {
      netVersion: '59144',
      chainId: '0xe708',
      genesisBlock: LINEA_GENESIS_BLOCK,
    },
  );

  await setupInfuraChainJsonRpcMock(
    mockServer,
    /^https:\/\/sepolia\.infura\.io\/v3*/u,
    {
      netVersion: '11155111',
      chainId: '0xaa36a7',
      genesisBlock: SEPOLIA_GENESIS_BLOCK,
    },
  );

  await setupMockPostRequest(
    mockServer,
    /^https:\/\/solana-mainnet\.infura\.io\/v3*/u,
    {
      method: 'getGenesisHash',
      params: [],
    },
    {
      result: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
  );
}
