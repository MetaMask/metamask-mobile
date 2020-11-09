import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../../styles/common';
import RemoteImage from '../../../Base/RemoteImage';
import Text from '../../../Base/Text';

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.grey000,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 100,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	icon: {
		marginRight: 8,
		width: 24,
		height: 24
	},
	emptyIcon: {
		borderRadius: 12,
		backgroundColor: colors.grey200,
		alignItems: 'center',
		justifyContent: 'center'
	},
	tokenSymbol: {
		fontSize: 16,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	caretDown: {
		textAlign: 'right',
		color: colors.grey500,
		marginLeft: 10,
		marginRight: 5
	}
});

// eslint-disable-next-line import/no-commonjs
const ethLogo = require('../../../../images/eth-logo.png');

const EmptyIcon = props => <View style={[styles.icon, styles.emptyIcon]} {...props} />;

function TokenSelectButton({ icon, symbol, onPress, disabled }) {
	const renderIcon = useMemo(() => {
		if (symbol === 'ETH') {
			return <RemoteImage fadeIn source={ethLogo} style={styles.icon} />;
		} else if (symbol && icon) {
			return <RemoteImage fadeIn source={{ uri: icon }} style={styles.icon} />;
		} else if (symbol) {
			return (
				<EmptyIcon>
					<Text style={styles.tokenSymbol}>{symbol[0].toUpperCase()}</Text>
				</EmptyIcon>
			);
		}

		return <EmptyIcon />;
	}, [symbol, icon]);
	return (
		<TouchableOpacity onPress={onPress} disabled={disabled}>
			<View style={styles.container}>
				{renderIcon}
				<Text primary>{symbol || 'Select a token'}</Text>
				<Icon name="caret-down" size={18} style={styles.caretDown} />
			</View>
		</TouchableOpacity>
	);
}

TokenSelectButton.propTypes = {
	icon: PropTypes.string,
	symbol: PropTypes.string,
	onPress: PropTypes.func,
	disabled: PropTypes.bool
};

export default TokenSelectButton;
