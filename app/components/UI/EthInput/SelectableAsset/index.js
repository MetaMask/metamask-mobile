import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { fontStyles } from '../../../../styles/common';

const styles = StyleSheet.create({
	icon: {
		paddingTop: 5,
		paddingRight: 8
	},
	option: {
		flexDirection: 'row'
	},
	symbol: {
		...fontStyles.bold
	},
	balance: {
		...fontStyles.normal
	},
	optionContent: {
		paddingLeft: 8
	}
});

/**
 * PureComponent that renders a selectable asset
 */
export default class SelectableAsset extends PureComponent {
	static propTypes = {
		asset: PropTypes.object,
		/**
		 * Callback when asset is selected
		 */
		onPress: PropTypes.func,
		/**
		 * Title to display
		 */
		title: PropTypes.string,
		/**
		 * Sub title to display
		 */
		subTitle: PropTypes.string,
		/**
		 * Callback when asset is selected
		 */
		icon: PropTypes.object
	};

	render = () => {
		const { onPress, title, subTitle, icon, asset } = this.props;
		const disable = onPress ? undefined : true;
		return (
			<TouchableOpacity
				key={asset.address + asset.tokenId || asset.symbol}
				onPress={onPress}
				style={styles.option}
				disabled={disable}
			>
				<View style={styles.icon}>{icon}</View>
				<View style={styles.optionContent}>
					<Text style={styles.symbol}>{title}</Text>
					<Text style={styles.balance}>{subTitle}</Text>
				</View>
			</TouchableOpacity>
		);
	};
}
