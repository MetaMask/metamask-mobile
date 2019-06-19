import namehash from 'eth-ens-namehash';
import Eth from 'ethjs-query';
import EthContract from 'ethjs-contract';
import registryAbi from './contracts/registry';
import resolverAbi from './contracts/resolver';
import contentHash from 'content-hash';

export default async function resolveEnsToIpfsContentId({ provider, name }) {
	const eth = new Eth(provider);
	const hash = namehash.hash(name);
	const contract = new EthContract(eth);
	// lookup registry
	const chainId = Number.parseInt(await eth.net_version(), 10);
	const registryAddress = getRegistryForChainId(chainId);
	if (!registryAddress) {
		throw new Error(`EnsIpfsResolver - no known ens-ipfs registry for chainId "${chainId}"`);
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
			throw new Error(`EnsIpfsResolver - no content ID found for name "${name}"`);
		}
		return { type: 'ipfs-ns', hash: content.slice(2) };
	}

	throw new Error(
		`EnsIpfsResolver - the resolver for name "${name}" is not standard, it should either supports contenthash() or content()`
	);
}

function hexValueIsEmpty(value) {
	return [
		undefined,
		null,
		'0x',
		'0x0',
		'0x0000000000000000000000000000000000000000000000000000000000000000'
	].includes(value);
}

function getRegistryForChainId(chainId) {
	switch (chainId) {
		// mainnet
		case 1:
			return '0x314159265dd8dbb310642f98f50c066173c1259b';
		// ropsten
		case 3:
			return '0x112234455c3a32fd11230c42e7bccd4a84e02010';
	}
}
