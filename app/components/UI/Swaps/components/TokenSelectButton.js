import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../../styles/common';

import Text from '../../../Base/Text';
import TokenIcon from './TokenIcon';

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
		marginRight: 8
	},
	caretDown: {
		textAlign: 'right',
		color: colors.grey500,
		marginLeft: 10,
		marginRight: 5
	}
});

function TokenSelectButton({ icon, symbol, onPress, disabled, label }) {
	return (
		<TouchableOpacity onPress={onPress} disabled={disabled}>
			<View style={styles.container}>
				<View style={styles.icon}>
					<TokenIcon icon={icon} symbol={symbol} />
				</View>
				<Text primary>{symbol || label}</Text>
				<Icon name="caret-down" size={18} style={styles.caretDown} />
			</View>
		</TouchableOpacity>
	);
}

TokenSelectButton.propTypes = {
	icon: PropTypes.string,
	symbol: PropTypes.string,
	label: PropTypes.string,
	onPress: PropTypes.func,
	disabled: PropTypes.bool
};

export default TokenSelectButton;
