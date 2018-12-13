import React, { Component } from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../styles/common';
import CollectibleOverview from '../CollectibleOverview';
import { strings } from '../../../locales/i18n';
import { getNavigationOptionsTitle } from '../Navbar';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: 600,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	assetOverviewWrapper: {
		flex: 1
	}
});

/**
 * View that displays a specific collectible asset
 */
export default class Collectible extends Component {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the asset to be displayed
		 */
		asset: PropTypes.object,
		/**
		 * Callback triggered on modal hide
		 */
		onHide: PropTypes.func
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(`${navigation.getParam('name', '')} (${navigation.getParam('symbol', '')})`);

	render = () => {
		const { asset, navigation, onHide } = this.props;
		return (
			<View style={styles.root}>
				<View>
					<Text style={styles.title} onPress={onHide}>
						{strings('wallet.collectible')}
					</Text>
				</View>
				<ScrollView style={styles.wrapper} ref={this.scrollViewRef}>
					<View testID={'asset'}>
						<View style={styles.assetOverviewWrapper}>
							<CollectibleOverview navigation={navigation} asset={asset} />
						</View>
					</View>
				</ScrollView>
			</View>
		);
	};
}
