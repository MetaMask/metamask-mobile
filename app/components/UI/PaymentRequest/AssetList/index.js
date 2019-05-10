import React, { Component } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import StyledButton from '../../StyledButton';
import AssetIcon from '../../AssetIcon';
import { colors, fontStyles } from '../../../../styles/common';

const styles = StyleSheet.create({
	item: {
		borderWidth: 1,
		borderColor: colors.grey100,
		padding: 8,
		marginBottom: 8,
		borderRadius: 8
	},
	assetListElement: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start'
	},
	text: {
		...fontStyles.normal
	},
	textSymbol: {
		...fontStyles.bold,
		paddingBottom: 4,
		fontSize: 16
	},
	assetInfo: {
		flex: 1,
		flexDirection: 'column',
		padding: 4
	},
	assetIcon: {
		flexDirection: 'column',
		alignSelf: 'center',
		marginRight: 12
	},
	ethLogo: {
		width: 50,
		height: 50
	}
});

/**
 * Component that provides ability to search assets.
 */
export default class AssetList extends Component {
	static propTypes = {
		/**
		 * Array of assets objects returned from the search
		 */
		searchResults: PropTypes.array,
		/**
		 * Callback triggered when a token is selected
		 */
		handleSelectAsset: PropTypes.func
	};

	render = () => {
		const { searchResults, handleSelectAsset } = this.props;

		return (
			<View style={styles.rowWrapper} testID={'add-searched-token-screen'}>
				{searchResults.slice(0, 6).map((_, i) => {
					const { symbol, name, logo } = searchResults[i] || {};
					return (
						<StyledButton
							type={'normal'}
							containerStyle={styles.item}
							onPress={() => handleSelectAsset(searchResults[i])} // eslint-disable-line
							key={i}
						>
							<View style={styles.assetListElement}>
								<View style={styles.assetIcon}>
									{symbol === 'ETH' ? (
										<Image source={logo} style={styles.ethLogo} />
									) : (
										<AssetIcon logo={logo} />
									)}
								</View>
								<View style={styles.assetInfo}>
									<Text style={styles.textSymbol}>{symbol}</Text>
									<Text style={styles.text}>{name}</Text>
								</View>
							</View>
						</StyledButton>
					);
				})}
			</View>
		);
	};
}
