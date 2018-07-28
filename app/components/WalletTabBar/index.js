import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, Animated, ViewPropTypes } from 'react-native';
import GenericButton from '../GenericButton'; // eslint-disable-line import/no-unresolved
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	tab: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	tabs: {
		height: 50,
		flexDirection: 'row',
		justifyContent: 'space-around',
		borderWidth: StyleSheet.hairlineWidth,
		borderTopWidth: 1,
		borderLeftWidth: 0,
		borderRightWidth: 0,
		borderColor: colors.borderColor,
		backgroundColor: colors.white
	}
});

export default class WalletTabBar extends Component {
	static propTypes = {
		goToPage: PropTypes.func,
		activeTab: PropTypes.number,
		tabs: PropTypes.array,
		renderTab: PropTypes.func,
		underlineStyle: ViewPropTypes.style,
		containerWidth: PropTypes.number,
		scrollValue: PropTypes.number
	};

	renderTab(name, page, isTabActive, onPressHandler) {
		const textColor = isTabActive ? colors.primary : colors.fontTertiary;
		const fontWeight = isTabActive ? 'bold' : 'normal';

		return (
			<GenericButton
				key={name}
				accessible
				accessibilityLabel={name}
				accessibilityTraits="button"
				onPress={onPressHandler(page)}
			>
				<View style={styles.tab}>
					<Text style={{ color: textColor, fontWeight }}>{name}</Text>
				</View>
			</GenericButton>
		);
	}

	render() {
		const containerWidth = this.props.containerWidth;
		const numberOfTabs = this.props.tabs.length;
		const tabUnderlineStyle = {
			position: 'absolute',
			width: containerWidth / numberOfTabs,
			height: 2,
			backgroundColor: colors.primary,
			bottom: 0
		};

		const translateX = this.props.scrollValue.interpolate({
			inputRange: [0, 1],
			outputRange: [0, containerWidth / numberOfTabs]
		});
		return (
			<View style={styles.tabs}>
				{this.props.tabs.map((name, page) => {
					const isTabActive = this.props.activeTab === page;
					const renderTab = this.props.renderTab || this.renderTab;
					return renderTab(name, page, isTabActive, this.props.goToPage);
				})}
				<Animated.View
					style={[
						tabUnderlineStyle,
						{
							transform: [{ translateX }]
						},
						this.props.underlineStyle
					]}
				/>
			</View>
		);
	}
}
