import React, { PureComponent } from 'react';
import { renderShortAddress } from '../../../../util/address';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Identicon from '../../../UI/Identicon';
import { fontStyles, colors } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	addressElementWrapper: {
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	},
	addressElementInformation: {
		flexDirection: 'column'
	},
	addressIdenticon: {
		paddingRight: 16
	},
	addressTextNickname: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 14
	},
	addressTextAddress: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500
	}
});

class AddressElement extends PureComponent {
	static propTypes = {
		/**
		 * Name to display
		 */
		name: PropTypes.string,
		/**
		 * Ethereum address
		 */
		address: PropTypes.string,
		/**
		 * Callback on account press
		 */
		onAccountPress: PropTypes.func,
		/**
		 * Callback on account long press
		 */
		onAccountLongPress: PropTypes.func,
		/**
		 * Network id
		 */
		network: PropTypes.string
	};

	state = {
		name: this.props.name,
		address: this.props.address
	};

	componentDidMount = async () => {
		const { name, address } = this.state;
		const { network } = this.props;
		if (!name) {
			const ensName = await doENSReverseLookup(address, network);
			this.setState({ name: ensName });
		}
	};

	render = () => {
		const { onAccountPress, onAccountLongPress } = this.props;
		const { name, address } = this.state;
		const primaryLabel = name && name[0] !== ' ' ? name : renderShortAddress(address);
		const secondaryLabel = name && name[0] !== ' ' && renderShortAddress(address);
		return (
			<TouchableOpacity
				onPress={() => onAccountPress(address)} /* eslint-disable-line */
				onLongPress={() => onAccountLongPress(address)} /* eslint-disable-line */
				key={address}
				style={styles.addressElementWrapper}
			>
				<View style={styles.addressIdenticon}>
					<Identicon address={address} diameter={28} />
				</View>
				<View style={styles.addressElementInformation}>
					<Text style={styles.addressTextNickname} numberOfLines={1}>
						{primaryLabel}
					</Text>
					{!!secondaryLabel && (
						<Text style={styles.addressTextAddress} numberOfLines={1}>
							{secondaryLabel}
						</Text>
					)}
				</View>
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(AddressElement);
