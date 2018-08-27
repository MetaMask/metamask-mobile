import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import getNavbarOptions from '../Navbar';
import SendScreen from '../SendScreen';
import ReceiveScreen from '../ReceiveScreen';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.slate,
		flex: 1
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
	},
	tabStyle: {
		paddingBottom: 0
	},
	textStyle: {
		fontSize: 16,
		letterSpacing: 0.5,
		...fontStyles.bold
	}
});

/**
 * View that wraps the whole Transfer Tab.
 * Which includes send and receive
 */
export default class Transfer extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Transfer', navigation);

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.primary}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	render() {
		return (
			<View style={styles.wrapper}>
				<ScrollableTabView renderTabBar={this.renderTabBar}>
					<SendScreen tabLabel="SEND" />
					<ReceiveScreen tabLabel="RECEIVE" />
				</ScrollableTabView>
			</View>
		);
	}
}
