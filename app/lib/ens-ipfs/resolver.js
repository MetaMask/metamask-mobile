import {
  createPublicClient,
  custom,
  decodeFunctionResult,
  encodeFunctionData,
  toHex,
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { namehash, normalize, packetToBytes } from 'viem/ens';
import contentHash from 'content-hash';
import Engine from '../../core/Engine';
import { IPFS_GATEWAY_DISABLED_ERROR } from '../../components/Views/BrowserTab/constants';

/**
 * Chains on which `.eth` websites are resolved. The viem chain definitions
 * carry the ENS Universal Resolver address.
 */
const CHAIN_ID_TO_VIEM_CHAIN = {
  '0x1': mainnet,
  '0xaa36a7': sepolia,
};

/**
 * `resolve(bytes name, bytes data)` on the ENS Universal Resolver. The
 * Universal Resolver finds the resolver by walking up the name (ENSIP-10)
 * and forwards `data` to it, so wildcard and offchain resolvers, including
 * the ENSv2 forwarder on `eth`, answer correctly. A direct
 * `registry.resolver(namehash(name))` read of the name's own node does not:
 * for a name migrated to ENSv2 the v1 registry returns the zero address.
 */
const universalResolverResolveAbi = [
  {
    name: 'resolve',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'bytes' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: '', type: 'bytes' },
      { name: 'address', type: 'address' },
    ],
  },
];

/**
 * EIP-1577 `contenthash(bytes32 node)` on the resolver.
 */
const contenthashResolverAbi = [
  {
    name: 'contenthash',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes' }],
  },
];

/**
 * Resolve the content hash of an ENS name through the Universal Resolver.
 *
 * @param {object} options - The options.
 * @param {object} options.provider - EIP-1193 provider for the chain.
 * @param {string} options.name - The ENS name.
 * @param {string} options.chainId - The hex chain ID.
 * @returns {Promise<{type: string, hash: string}>} The content hash codec
 * (e.g. `ipfs-ns`, `swarm-ns`) and the decoded hash.
 */
export default async function resolveEnsToIpfsContentId({
  provider,
  name,
  chainId,
}) {
  const chain = CHAIN_ID_TO_VIEM_CHAIN[chainId];
  if (!chain) {
    throw new Error(
      `EnsIpfsResolver - no known ens-ipfs registry for chainId "${chainId}"`,
    );
  }

  const normalizedName = normalize(name);
  const client = createPublicClient({ chain, transport: custom(provider) });

  const [rawContentHash] = await client.readContract({
    address: chain.contracts.ensUniversalResolver.address,
    abi: universalResolverResolveAbi,
    functionName: 'resolve',
    args: [
      toHex(packetToBytes(normalizedName)),
      encodeFunctionData({
        abi: contenthashResolverAbi,
        functionName: 'contenthash',
        args: [namehash(normalizedName)],
      }),
    ],
  });

  const encodedContentHash =
    rawContentHash === '0x'
      ? '0x'
      : decodeFunctionResult({
          abi: contenthashResolverAbi,
          functionName: 'contenthash',
          data: rawContentHash,
        });

  if (hexValueIsEmpty(encodedContentHash)) {
    throw new Error(
      `EnsIpfsResolver - no content hash found for name "${name}"`,
    );
  }

  const decodedContentHash = contentHash.decode(encodedContentHash);
  const type = contentHash.getCodec(encodedContentHash);
  if (!Engine.context.PreferencesController.state.isIpfsGatewayEnabled) {
    throw new Error(IPFS_GATEWAY_DISABLED_ERROR);
  }
  return { type, hash: decodedContentHash };
}

function hexValueIsEmpty(value) {
  return [
    undefined,
    null,
    '0x',
    '0x0',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ].includes(value);
}

export function isGatewayUrl(urlObj) {
  // All IPFS gateway urls start with the path /ipfs/
  if (urlObj.pathname.substr(0, 6) === '/ipfs/') return true;
  // All Swarm gateway urls start with the path /bzz:/
  if (urlObj.pathname.substr(0, 6) === '/bzz:/') return true;
  // All IPNS gateway urls start with the path /ipns/
  if (urlObj.pathname.substr(0, 6) === '/ipns/') return true;

  return false;
}
