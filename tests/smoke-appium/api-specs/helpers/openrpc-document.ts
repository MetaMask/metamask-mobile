import { parseOpenRPCDocument } from '@open-rpc/schema-utils-js';
import type { MethodObject, OpenrpcDocument } from '@open-rpc/meta-schema';

/** OpenRPC document version used by Detox api-specs (keep in sync). */
export const OPENRPC_DOCUMENT_URL =
  'https://metamask.github.io/api-specs/0.10.8/openrpc.json';

/** Mock JSON-RPC server port (fixed; suite is serial). */
export const MOCK_RPC_PORT = 8545;

/** Local / Ganache chain id used in fixture + OpenRPC examples. */
export const API_SPECS_CHAIN_ID = 1337;

export const API_SPECS_ACCOUNT_ADDRESS =
  '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

/**
 * Methods that surface a confirmation UI (handled by ConfirmationsRejectRule;
 * excluded from JsonSchemaFaker / Examples rules).
 */
export const METHODS_WITH_CONFIRMATIONS: readonly string[] = [
  'wallet_requestPermissions',
  'eth_requestAccounts',
  'wallet_watchAsset',
  'personal_sign',
  'wallet_addEthereumChain',
  'eth_signTypedData_v4',
  'wallet_switchEthereumChain',
  'eth_getEncryptionPublicKey',
];

/**
 * Methods skipped entirely by `@open-rpc/test-coverage` (unsupported or quarantined).
 */
export const SKIP_METHODS: readonly string[] = [
  'eth_coinbase',
  'wallet_registerOnboarding',
  'eth_getEncryptionPublicKey',
  'wallet_watchAsset',
  // Quarantined — https://github.com/MetaMask/MetaMask-planning/issues/5207
  'personal_sign',
  'eth_signTypedData_v4',
];

type MethodLike = MethodObject & {
  examples?: {
    name?: string;
    description?: string;
    params?: { name?: string; value?: unknown }[];
    result?: { name?: string; value?: unknown; description?: string };
  }[];
};

const asMethodObjects = (document: OpenrpcDocument): MethodLike[] =>
  (document.methods ?? []).filter(
    (method): method is MethodLike =>
      typeof method === 'object' &&
      method !== null &&
      'name' in method &&
      typeof (method as MethodObject).name === 'string',
  );

const requireMethod = (document: OpenrpcDocument, name: string): MethodLike => {
  const method = asMethodObjects(document).find((m) => m.name === name);
  if (!method) {
    throw new Error(`OpenRPC method not found: ${name}`);
  }
  return method;
};

/**
 * Fetch and mutate the MetaMask OpenRPC document for mobile api-specs runs
 * (examples, net_version, schema tweaks). Mirrors Detox json-rpc-coverage.js.
 */
export async function prepareOpenRpcDocument(
  chainId: number = API_SPECS_CHAIN_ID,
): Promise<OpenrpcDocument> {
  const openrpcDocument = await parseOpenRPCDocument(OPENRPC_DOCUMENT_URL);

  const switchEthereumChain = requireMethod(
    openrpcDocument,
    'wallet_switchEthereumChain',
  );
  switchEthereumChain.examples = [
    {
      name: 'wallet_switchEthereumChain',
      description: 'Example of a wallet_switchEthereumChain request to sepolia',
      params: [
        {
          name: 'SwitchEthereumChainParameter',
          value: {
            chainId: '0xaa36a7',
          },
        },
      ],
      result: {
        name: 'wallet_switchEthereumChain',
        value: null,
      },
    },
  ];

  const chainIdMethod = requireMethod(openrpcDocument, 'eth_chainId');
  chainIdMethod.examples = [
    {
      name: 'chainIdExample',
      description: 'Example of a chainId request',
      params: [],
      result: {
        name: 'chainIdResult',
        value: `0x${chainId.toString(16)}`,
      },
    },
  ];

  const blockNumber = requireMethod(openrpcDocument, 'eth_blockNumber');
  blockNumber.examples = [
    {
      name: 'blockNumberExample',
      description: 'Example of a blockNumber request',
      params: [],
      result: {
        name: 'blockNumberResult',
        value: '0x1',
      },
    },
  ];

  const signTypedData4 = requireMethod(openrpcDocument, 'eth_signTypedData_v4');
  if (signTypedData4.examples?.[0]?.params?.[0]) {
    signTypedData4.examples[0].params[0].value = API_SPECS_ACCOUNT_ADDRESS;
  }
  const typedDataDomain = signTypedData4.examples?.[0]?.params?.[1]?.value as
    | { domain?: { chainId?: number } }
    | undefined;
  if (typedDataDomain?.domain) {
    typedDataDomain.domain.chainId = chainId;
  }

  const personalSign = requireMethod(openrpcDocument, 'personal_sign');
  personalSign.examples = [
    {
      name: 'personalSignExample',
      description: 'Example of a personalSign request',
      params: [
        {
          name: 'data',
          value: '0xdeadbeef',
        },
        {
          name: 'address',
          value: API_SPECS_ACCOUNT_ADDRESS,
        },
      ],
      result: {
        name: 'personalSignResult',
        value: '0x1a8819e0c9bab700',
      },
    },
  ];

  const transaction = (
    openrpcDocument.components?.schemas?.TransactionInfo as
      | { allOf?: Record<string, unknown>[] }
      | undefined
  )?.allOf?.[0];
  if (transaction) {
    delete transaction.unevaluatedProperties;
  }

  // net_version missing from execution-apis:
  // https://github.com/ethereum/execution-apis/issues/540
  // Cast needed: parseOpenRPCDocument types methods via schema-utils-js's
  // nested @open-rpc/meta-schema, which is a separate type identity.
  openrpcDocument.methods.push({
    name: 'net_version',
    params: [],
    result: {
      description: 'Returns the current network ID.',
      name: 'net_version',
      schema: {
        type: 'string',
      },
    },
    description: 'Returns the current network ID.',
    examples: [
      {
        name: 'net_version',
        description: 'Example of a net_version request',
        params: [],
        result: {
          name: 'net_version',
          description: 'The current network ID',
          value: '0x1',
        },
      },
    ],
  } as (typeof openrpcDocument.methods)[number]);

  return openrpcDocument;
}

/**
 * Methods skipped by JsonSchemaFaker / Examples rules (confirmations + unsupported).
 */
export function getFilteredMethodsForNonConfirmationRules(
  document: OpenrpcDocument,
): string[] {
  return asMethodObjects(document)
    .filter((method) => {
      const name = method.name;
      return (
        name.includes('snap') ||
        name.includes('Snap') ||
        name.toLowerCase().includes('account') ||
        name.includes('crypt') ||
        name.includes('blob') ||
        name.includes('sendTransaction') ||
        name.startsWith('wallet_scanQRCode') ||
        name.includes('filter') ||
        name.includes('Filter') ||
        name.includes('getBlockReceipts') ||
        name.includes('maxPriorityFeePerGas') ||
        METHODS_WITH_CONFIRMATIONS.includes(name)
      );
    })
    .map((method) => method.name);
}

export function getAllMethodNames(document: OpenrpcDocument): string[] {
  return asMethodObjects(document).map((method) => method.name);
}
