import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { InteractionManager, Text } from 'react-native';
import { connect } from 'react-redux';
import { renderShortAddress, renderFullAddress } from '../../../util/address';
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { isValidAddress } from 'ethereumjs-util';

/**
 * View that renders an ethereum address
 * or its ENS name when supports reverse lookup
 */
class EthereumAddress extends PureComponent {
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
		let formattedAddress = rawAddress;

		if (isValidAddress(rawAddress)) {
			if (type && type === 'short') {
				formattedAddress = renderShortAddress(rawAddress);
			} else {
				formattedAddress = renderFullAddress(rawAddress);
			}
		}
		return formattedAddress;
	}

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.doReverseLookup();
		});
	}

	componentDidUpdate(prevProps) {
		if (prevProps.address !== this.props.address) {
			requestAnimationFrame(() => {
				this.formatAndResolveIfNeeded();
			});
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
		const { network, address } = this.props;
		try {
			const name = await doENSReverseLookup(address, network);
			this.setState({ ensName: name });
			// eslint-disable-next-line no-empty
		} catch (e) {}
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
