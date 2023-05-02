import namehash from 'eth-ens-namehash';
import Eth from 'ethjs-query';
import EthContract from 'ethjs-contract';
import registryAbi from './contracts/registry';
import resolverAbi from './contracts/resolver';
import contentHash from 'content-hash';
import multihash from 'multihashes';

export default async function resolveEnsToIpfsContentId({ provider, name }) {
  const eth = new Eth(provider);
  const hash = namehash.hash(name);
  const contract = new EthContract(eth);
  // lookup registry
  const chainId = Number.parseInt(await eth.net_version(), 10);
  const registryAddress = getRegistryForChainId(chainId);
  if (!registryAddress) {
    throw new Error(
      `EnsIpfsResolver - no known ens-ipfs registry for chainId "${chainId}"`,
    );
  }
  const Registry = contract(registryAbi).at(registryAddress);
  // lookup resolver
  const resolverLookupResult = await Registry.resolver(hash);
  const resolverAddress = resolverLookupResult[0];
  if (hexValueIsEmpty(resolverAddress)) {
    throw new Error(`EnsIpfsResolver - no resolver found for name "${name}"`);
  }
  const Resolver = contract(resolverAbi).at(resolverAddress);
  const isEIP1577Compliant = await Resolver.supportsInterface('0xbc1c58d1');
  const isLegacyResolver = await Resolver.supportsInterface('0xd8389dc5');
  if (isEIP1577Compliant[0]) {
    const contentLookupResult = await Resolver.contenthash(hash);
    const rawContentHash = contentLookupResult[0];
    const decodedContentHash = contentHash.decode(rawContentHash);
    const type = contentHash.getCodec(rawContentHash);
    return { type, hash: decodedContentHash };
  }
  if (isLegacyResolver[0]) {
    // lookup content id
    const contentLookupResult = await Resolver.content(hash);
    const content = contentLookupResult[0];
    if (hexValueIsEmpty(content)) {
      throw new Error(
        `EnsIpfsResolver - no content ID found for name "${name}"`,
      );
    }
    const nonPrefixedHex = content.slice(2);

    // Multihash
    const buffer = multihash.fromHexString(nonPrefixedHex);
    const contentId = multihash.toB58String(
      multihash.encode(buffer, 'sha2-256'),
    );

    return { type: 'ipfs-ns', hash: contentId };
  }

  throw new Error(
    `EnsIpfsResolver - the resolver for name "${name}" is not standard, it should either supports contenthash() or content()`,
  );
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

function getRegistryForChainId(chainId) {
  switch (chainId) {
    // mainnet
    case 1:
      return '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    // goerli
    case 5:
      return '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    // sepolia
    case 11155111:
      return '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    default:
      return null;
  }
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
