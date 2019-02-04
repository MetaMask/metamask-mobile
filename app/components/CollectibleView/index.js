import React, { Component } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../styles/common';
import CollectibleOverview from '../CollectibleOverview';
import { getNavigationOptionsTitle } from '../Navbar';
import LinearGradient from 'react-native-linear-gradient';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: 600,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10
	},
	wrapper: {
		flex: 1
	},
	assetOverviewWrapper: {
		flex: 1
	}
});

/**
 * View that displays a specific collectible asset
 */
export default class CollectibleView extends Component {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object
	};

	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(`${navigation.getParam('name', '')}`);

	render = () => {
		const {
			navigation: {
				state: { params }
			},
			navigation
		} = this.props;
		const collectible = params;
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.root}>
				<ScrollView style={styles.wrapper} ref={this.scrollViewRef}>
					<View testID={'asset'}>
						<View style={styles.assetOverviewWrapper}>
							<CollectibleOverview navigation={navigation} collectible={collectible} />
						</View>
					</View>
				</ScrollView>
			</LinearGradient>
		);
	};
}
