import React, { Component } from 'react';
import { ScrollView, View, StyleSheet, Dimensions, InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../styles/common';
import CollectibleOverview from '../CollectibleOverview';

const styles = StyleSheet.create({
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
		navigation: PropTypes.object
	};

	static navigationOptions = ({ navigation }) => ({
		title: `${navigation.getParam('name', '')} (${navigation.getParam('symbol', '')})`,
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	scrollViewRef = React.createRef();

	adjustScroll = index => {
		InteractionManager.runAfterInteractions(() => {
			const { current } = this.scrollViewRef;
			const rowHeight = 100;
			const rows = index * rowHeight;
			const topPadding = Dimensions.get('window').height / 2 - 120;
			current.scrollTo({ y: rows + topPadding });
		});
	};

	render = () => {
		const {
			navigation: {
				state: { params }
			},
			navigation
		} = this.props;
		return (
			<ScrollView style={styles.wrapper} ref={this.scrollViewRef}>
				<View testID={'asset'}>
					<View style={styles.assetOverviewWrapper}>
						<CollectibleOverview navigation={navigation} asset={navigation && params} />
					</View>
				</View>
			</ScrollView>
		);
	};
}
