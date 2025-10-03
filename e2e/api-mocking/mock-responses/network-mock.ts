/* eslint-disable no-console */
import type { Mockttp } from 'mockttp';
import type { TestSpecificMock } from '../../framework';
import { PopularNetworksList } from '../../resources/networks.e2e';
import { Json } from '@metamask/eth-query';
import { Hex, remove0x } from '@metamask/utils';

interface JsonRpcRequest {
  method: string;
  id: number;
  params?: Json[];
}

export function NetworkMock(chainId: Hex): TestSpecificMock {
  return async (mockServer: Mockttp) => {
    const networkConfiguration = Object.values(PopularNetworksList).find(
      (network) => network.providerConfig.chainId === chainId,
    );

    const { rpcUrl, nickname: name } =
      networkConfiguration?.providerConfig ?? {};

    if (!rpcUrl || !name) {
      throw new Error(`RPC URL or name not found for chain ID: ${chainId}`);
    }

    await mockServer
      .forPost('/proxy')
      .matching((request) => {
        const urlParam = new URL(request.url).searchParams.get('url');
        return Boolean(urlParam?.includes(rpcUrl));
      })
      .asPriority(1000)
      .thenCallback(async (request) => {
        try {
          const body = (await request.body.getJson()) as
            | JsonRpcRequest
            | JsonRpcRequest[];

          if (Array.isArray(body)) {
            const results = body.map((req) => ({
              id: req.id,
              jsonrpc: '2.0',
              result: getResponse(req, chainId, name),
            }));

            return {
              statusCode: 200,
              body: JSON.stringify(results),
            };
          }

          const result = getResponse(body, chainId, name);

          return {
            statusCode: 200,
            body: JSON.stringify({
              id: body?.id ?? 1,
              jsonrpc: '2.0',
              result,
            }),
          };
        } catch (error) {
          console.log(`[Network Mock] [${name}] Error`, error);
          return {
            statusCode: 200,
            body: JSON.stringify({
              id: 1,
              jsonrpc: '2.0',
              result: '0x',
            }),
          };
        }
      });
  };
}

function getResponse(req: JsonRpcRequest, chainId: Hex, name: string): Json {
  console.log(`[Network Mock] [${name}] ${req.method}`);

  const callTo = (
    req.params?.[0] as { to?: string } | undefined
  )?.to?.toLowerCase();

  const chainIdSuffix = remove0x(chainId);

  const responses: Record<string, Json> = {
    eth_chainId: chainId,

    eth_getBalance: '0x70357b0c96000',

    eth_call:
      callTo === '0x420000000000000000000000000000000000000f'
        ? '0x0000000000000000000000000000000000000000000000000000000000000000'
        : '0x',

    eth_estimateGas: '0x0',

    eth_gasPrice: '0x77359400',

    eth_getTransactionCount: '0x0',

    eth_getTransactionReceipt: {
      blockNumber: '0x1234567',
      blockHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      status: '0x1',
    },

    eth_blockNumber: '0x1234567',

    eth_getBlockByNumber: {
      number: '0x1234567',
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
      gasLimit: '0x1c9c380',
      gasUsed: '0x5208',
      transactions: [],
      baseFeePerGas: '0x3b9aca00',
    },

    eth_sendRawTransaction:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'.substring(
        0,
        66 - (chainIdSuffix.length + 1),
      ) + chainIdSuffix,

    net_version: parseInt(chainId, 16).toString(10),
  };

  return responses[req.method] ?? '0x';
}
