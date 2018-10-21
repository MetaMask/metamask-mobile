import namehash from 'eth-ens-namehash';
import multihash from 'multihashes';
import HttpProvider from 'ethjs-provider-http';
import Eth from 'ethjs-query';
import EthContract from 'ethjs-contract';
import registrarAbi from './contracts/registrar';
import resolverAbi from './contracts/resolver';

export default function ensResolve(name, provider) {
	const eth = new Eth(new HttpProvider(getProvider(provider.type)));
	const hash = namehash.hash(name);
	const contract = new EthContract(eth);
	const Registrar = contract(registrarAbi).at(getRegistrar(provider.type));
	return new Promise((resolve, reject) => {
		if (provider.type === 'mainnet' || provider.type === 'ropsten') {
			Registrar.resolver(hash)
				.then(address => {
					if (address === '0x0000000000000000000000000000000000000000') {
						reject(null);
					} else {
						const Resolver = contract(resolverAbi).at(address['0']);
						return Resolver.content(hash);
					}
				})
				.then(contentHash => {
					if (contentHash['0'] === '0x0000000000000000000000000000000000000000000000000000000000000000')
						reject(null);
					if (contentHash.ret !== '0x') {
						const hex = contentHash['0'].substring(2);
						const buf = multihash.fromHexString(hex);
						resolve(multihash.toB58String(multihash.encode(buf, 'sha2-256')));
					} else {
						reject(null);
					}
				});
		} else {
			return reject('unsupport');
		}
	});
}

function getProvider(type) {
	switch (type) {
		case 'mainnet':
			return 'https://mainnet.infura.io/';
		case 'ropsten':
			return 'https://ropsten.infura.io/';
		default:
			return 'http://localhost:8545/';
	}
}

function getRegistrar(type) {
	switch (type) {
		case 'mainnet':
			return '0x314159265dd8dbb310642f98f50c066173c1259b';
		case 'ropsten':
			return '0x112234455c3a32fd11230c42e7bccd4a84e02010';
		default:
			return '0x0000000000000000000000000000000000000000';
	}
}
