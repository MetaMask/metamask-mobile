import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native';
import { renderShortAddress, renderFullAddress } from '../../../util/address';
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
	};

	ens = null;
	constructor(props) {
		super(props);
		const { address, type } = props;

		this.state = {
			ensName: null,
			address: this.formatAddress(address, type),
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
		this.setState({ address: formattedAddress, ensName: null });
	}

	render() {
		return (
			<Text style={this.props.style} numberOfLines={1}>
				{this.state.address}
			</Text>
		);
	}
}

EthereumAddress.defaultProps = {
	style: null,
	type: 'full',
};

export default EthereumAddress;
