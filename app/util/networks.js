/**
 * List of the supported networks
 * including name, id, and color
 *
 * This values are used in certain places like
 * navbar and the network switcher.
 */

export default {
	mainnet: {
		name: 'Ethereum Main Network',
		networkId: 1,
		color: '#3cc29e'
	},
	ropsten: {
		name: 'Ropsten Test Network',
		networkId: 3,
		color: '#ff4a8d'
	},
	kovan: {
		name: 'Kovan Test Network',
		networkId: 42,
		color: '#7057ff'
	},
	rinkeby: {
		name: 'Rinkeby Test Network',
		networkId: 4,
		color: '#f6c343'
	}
};
