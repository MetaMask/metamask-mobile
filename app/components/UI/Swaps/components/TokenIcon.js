import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';

import RemoteImage from '../../../Base/RemoteImage';
import Text from '../../../Base/Text';
import { colors } from '../../../../styles/common';

/* eslint-disable import/no-commonjs */
const ethLogo = require('../../../../images/eth-logo.png');
const bnbLogo = require('../../../../images/bnb-logo.png');
/* eslint-enable import/no-commonjs */

const REGULAR_SIZE = 24;
const REGULAR_RADIUS = 12;
const MEDIUM_SIZE = 36;
const MEDIUM_RADIUS = 18;
const BIG_SIZE = 50;
const BIG_RADIUS = 25;
const BIGGEST_SIZE = 70;
const BIGGEST_RADIUS = 35;

const styles = StyleSheet.create({
	icon: {
		width: REGULAR_SIZE,
		height: REGULAR_SIZE,
		borderRadius: REGULAR_RADIUS,
	},
	iconMedium: {
		width: MEDIUM_SIZE,
		height: MEDIUM_SIZE,
		borderRadius: MEDIUM_RADIUS,
	},
	iconBig: {
		width: BIG_SIZE,
		height: BIG_SIZE,
		borderRadius: BIG_RADIUS,
	},
	iconBiggest: {
		width: BIGGEST_SIZE,
		height: BIGGEST_SIZE,
		borderRadius: BIGGEST_RADIUS,
	},
	emptyIcon: {
		backgroundColor: colors.grey200,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tokenSymbol: {
		fontSize: 16,
		textAlign: 'center',
		textAlignVertical: 'center',
	},
	tokenSymbolMedium: {
		fontSize: 22,
	},
	tokenSymbolBig: {
		fontSize: 26,
	},
});

const EmptyIcon = ({ medium, big, biggest, style, ...props }) => (
	<View
		style={[
			styles.icon,
			medium && styles.iconMedium,
			big && styles.iconBig,
			biggest && styles.iconBiggest,
			styles.emptyIcon,
			style,
		]}
		{...props}
	/>
);

EmptyIcon.propTypes = {
	medium: PropTypes.bool,
	big: PropTypes.bool,
	biggest: PropTypes.bool,
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

function TokenIcon({ symbol, icon, medium, big, biggest, style }) {
	if (symbol === 'ETH' || symbol === 'BNB') {
		return (
			<RemoteImage
				fadeIn
				source={symbol === 'ETH' ? ethLogo : bnbLogo}
				style={[
					styles.icon,
					medium && styles.iconMedium,
					big && styles.iconBig,
					biggest && styles.iconBiggest,
					style,
				]}
			/>
		);
	} else if (icon) {
		return (
			<RemoteImage
				fadeIn
				source={{ uri: icon }}
				style={[
					styles.icon,
					medium && styles.iconMedium,
					big && styles.iconBig,
					biggest && styles.iconBiggest,
					style,
				]}
			/>
		);
	} else if (symbol) {
		return (
			<EmptyIcon medium={medium} big={big} biggest={biggest} style={style}>
				<Text
					style={[
						styles.tokenSymbol,
						medium && styles.tokenSymbolMedium,
						(big || biggest) && styles.tokenSymbolBig,
						biggest && styles.tokenSymbolBiggest,
					]}
				>
					{symbol[0].toUpperCase()}
				</Text>
			</EmptyIcon>
		);
	}

	return <EmptyIcon medium={medium} style={style} />;
}

TokenIcon.propTypes = {
	symbol: PropTypes.string,
	icon: PropTypes.string,
	medium: PropTypes.bool,
	big: PropTypes.bool,
	biggest: PropTypes.bool,
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default TokenIcon;
