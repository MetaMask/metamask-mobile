import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';

import RemoteImage from '../../../Base/RemoteImage';
import Text from '../../../Base/Text';
import { colors } from '../../../../styles/common';

// eslint-disable-next-line import/no-commonjs
const ethLogo = require('../../../../images/eth-logo.png');

const styles = StyleSheet.create({
	icon: {
		width: 24,
		height: 24
	},
	iconMedium: {
		width: 36,
		height: 36
	},
	emptyIcon: {
		borderRadius: 12,
		backgroundColor: colors.grey200,
		alignItems: 'center',
		justifyContent: 'center'
	},
	emptyIconMedium: {
		borderRadius: 18
	},
	tokenSymbol: {
		fontSize: 16,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	tokenSymbolMedium: {
		fontSize: 22
	}
});

const EmptyIcon = ({ medium, ...props }) => (
	<View
		style={[
			styles.icon,
			props.medium && styles.iconMedium,
			styles.emptyIcon,
			props.medium && styles.emptyIconMedium
		]}
		{...props}
	/>
);

EmptyIcon.propTypes = {
	medium: PropTypes.bool
};

function TokenIcon({ symbol, icon, medium }) {
	if (symbol === 'ETH') {
		return <RemoteImage fadeIn source={ethLogo} style={[styles.icon, medium && styles.iconMedium]} />;
	} else if (icon) {
		return <RemoteImage fadeIn source={{ uri: icon }} style={[styles.icon, medium && styles.iconMedium]} />;
	} else if (symbol) {
		return (
			<EmptyIcon medium={medium}>
				<Text style={[styles.tokenSymbol, medium && styles.tokenSymbolMedium]}>{symbol[0].toUpperCase()}</Text>
			</EmptyIcon>
		);
	}

	return <EmptyIcon medium={medium} />;
}

TokenIcon.propTypes = {
	symbol: PropTypes.string,
	icon: PropTypes.string,
	medium: PropTypes.bool
};

export default TokenIcon;
