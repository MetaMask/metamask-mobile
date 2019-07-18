import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native';
import { connect } from 'react-redux';
import ENS from 'ethjs-ens';
import networkMap from 'ethjs-ens/lib/network-map.json';
import Engine from '../../../core/Engine';
import { renderShortAddress, renderFullAddress } from '../../../util/address';
import Logger from '../../../util/Logger';

/**
 * View that renders an ethereum address
 * or its ENS name when supports reverse lookup
 */
class EthereumAddress extends Component {
	static propTypes = {
		/**
		 * Styles to be applied to the text component
		 */
		style: PropTypes.any,
		/**
		 * Address to be rendered and resolved
		 */
		address: PropTypes.string,
		/**
		 * Type of formatting for the address
		 * can be "short" or "full"
		 */
		type: PropTypes.string,
		/**
		 * ID of the current network
		 */
		network: PropTypes.string
	};

	ens = null;
	constructor(props) {
		super(props);
		const { address, type } = props;

		this.state = {
			ensName: null,
			address: this.formatAddress(address, type)
		};
	}

	formatAddress(rawAddress, type) {
		let formattedAddress;

		if (type && type === 'short') {
			formattedAddress = renderShortAddress(rawAddress);
		} else {
			formattedAddress = renderFullAddress(rawAddress);
		}
		return formattedAddress;
	}

	getNetworkEnsSupport = () => {
		const { network } = this.props;
		return Boolean(networkMap[network]);
	};

	componentDidMount() {
		this.doReverseLookup();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.address !== this.props.address) {
			Logger.log('address changed');
			this.formatAndResolveIfNeeded();
		}
	}

	formatAndResolveIfNeeded() {
		const { address, type } = this.props;
		const formattedAddress = this.formatAddress(address, type);
		// eslint-disable-next-line react/no-did-update-set-state
		this.setState({ address: formattedAddress, ensName: null });
		this.doReverseLookup();
	}

	doReverseLookup = async () => {
		const { provider } = Engine.context.NetworkController;
		const { network, address } = this.props;

		const networkHasEnsSupport = this.getNetworkEnsSupport();
		if (networkHasEnsSupport) {
			this.ens = new ENS({ provider, network });
			try {
				const name = await this.ens.reverse(address);
				const resolvedAddress = await this.ens.lookup(name);
				if (address.toLowerCase() === resolvedAddress.toLowerCase()) {
					this.setState({ ensName: name });
				}
			} catch (e) {
				// Ignore errors about errors without ENS records
				if (e.toString().indexOf('ENS name not defined.') === -1) {
					Logger.log('address', this.props.address);
					Logger.log('netork', this.props.network);
					Logger.error('ENS reverse lookup error', e);
				}
			}
		}
	};

	render() {
		return (
			<Text style={this.props.style} numberOfLines={1}>
				{this.state.ensName ? this.state.ensName : this.state.address}
			</Text>
		);
	}
}

EthereumAddress.defaultProps = {
	style: null,
	type: 'full'
};

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(EthereumAddress);
