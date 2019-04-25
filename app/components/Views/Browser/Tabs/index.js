import React, { Component } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import TabThumbnail from './TabThumbnail';
import { colors, fontStyles } from '../../../../styles/common';

const styles = StyleSheet.create({
	noTabs: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	noTabsTitle: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 18,
		marginBottom: 10
	},
	noTabsDesc: {
		...fontStyles.normal,
		color: colors.fontSecondary,
		fontSize: 14
	},
	tabAction: {
		flex: 1,
		alignContent: 'center'
	},

	tabActionleft: {
		justifyContent: 'center'
	},
	tabActionRight: {
		justifyContent: 'center',
		alignItems: 'flex-end'
	},
	tabActionText: {
		color: colors.fontPrimary,
		...fontStyles.normal,
		fontSize: 14
	},
	actionDisabled: {
		color: colors.fontSecondary
	},
	tabsView: {
		flex: 1,
		backgroundColor: colors.grey000,
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	tabActions: {
		paddingHorizontal: 20,
		flexDirection: 'row',
		marginBottom: 30,
		paddingVertical: 10
	},
	tabs: {
		flex: 1
	},
	tabsContent: {
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		padding: 15
	},
	newTabIcon: {
		marginTop: 3,
		color: colors.white,
		fontSize: 24,
		textAlign: 'center',
		justifyContent: 'center',
		alignContent: 'center'
	},
	newTabIconButton: {
		alignSelf: 'center',
		justifyContent: 'center',
		alignContent: 'center',
		backgroundColor: colors.blue,
		borderRadius: 100,
		width: 30,
		height: 30
	}
});

export default class Tabs extends Component {
	static propTypes = {
		/**
		 * Array of tabs
		 */
		tabs: PropTypes.array,
		/**
		 * ID of the active tab
		 */
		activeTab: PropTypes.number,
		/**
		 * Flag that determines if the component
		 * should be visible or not
		 */
		visible: PropTypes.bool,
		/**
		 * Opens a new tab
		 */
		newTab: PropTypes.func,
		/**
		 * Closes a tab
		 */
		closeTab: PropTypes.func,
		/**
		 * Closes all tabs
		 */
		closeAllTabs: PropTypes.func,
		/**
		 * Dismiss the entire view
		 */
		closeTabsView: PropTypes.func,
		/**
		 * Switches to a specific tab
		 */
		switchToTab: PropTypes.func,
		/**
		 * Sets the current tab used for the animation
		 */
		animateCurrentTab: PropTypes.func
	};

	thumbnails = {};

	state = {
		currentTab: null
	};

	constructor(props) {
		super(props);
		props.tabs.forEach(tab => {
			this.thumbnails[tab.id] = React.createRef();
		});
	}

	onSwitch = async tab => {
		const position = await this.thumbnails[tab.id].current.measure();
		this.props.animateCurrentTab({ tab, position });
		setTimeout(() => {
			this.props.switchToTab(tab);
		}, 800);
		setTimeout(() => {
			this.props.animateCurrentTab({ tab: null, position: null });
		}, 1500);
	};

	renderTabs(tabs, activeTab) {
		if (tabs.length === 0) {
			return (
				<View style={styles.noTabs}>
					<Text style={styles.noTabsTitle}>{strings('browser.no_tabs_title')}</Text>
					<Text style={styles.noTabsDesc}>{strings('browser.no_tabs_desc')}</Text>
				</View>
			);
		}

		return tabs.map(tab => (
			// eslint-disable-next-line react/jsx-key
			<TabThumbnail
				ref={this.thumbnails[tab.id]}
				key={tab.id}
				tab={tab}
				isActiveTab={activeTab === tab.id}
				onClose={this.props.closeTab}
				onSwitch={this.onSwitch}
			/>
		));
	}

	render() {
		const { tabs, activeTab, visible, closeAllTabs, newTab, closeTabsView } = this.props;
		if (!visible) return null;

		return (
			<View style={styles.tabsView}>
				<ScrollView style={styles.tabs} contentContainerStyle={styles.tabsContent}>
					{this.renderTabs(tabs, activeTab)}
				</ScrollView>
				<View style={styles.tabActions}>
					<TouchableOpacity style={[styles.tabAction, styles.tabActionleft]} onPress={closeAllTabs}>
						<Text style={[styles.tabActionText, tabs.length === 0 ? styles.actionDisabled : null]}>
							{strings('browser.tabs_close_all')}
						</Text>
					</TouchableOpacity>
					<View style={styles.tabAction}>
						<TouchableOpacity style={styles.newTabIconButton} onPress={newTab}>
							<MaterialCommunityIcon name="plus" size={15} style={styles.newTabIcon} />
						</TouchableOpacity>
					</View>

					<TouchableOpacity style={[styles.tabAction, styles.tabActionRight]} onPress={closeTabsView}>
						<Text style={[styles.tabActionText, tabs.length === 0 ? styles.actionDisabled : null]}>
							{strings('browser.tabs_done')}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}
