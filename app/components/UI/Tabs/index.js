import React, { PureComponent } from 'react';
import {
	InteractionManager,
	Platform,
	Dimensions,
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet
} from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import TabThumbnail from './TabThumbnail';
import { colors, fontStyles } from '../../../styles/common';
import DeviceSize from '../../../util/DeviceSize';

const THUMB_HORIZONTAL_MARGIN = 16;
const THUMB_VERTICAL_MARGIN = 20;
const NAVBAR_SIZE = DeviceSize.isIphoneX() ? 88 : 64;
const THUMB_WIDTH = Dimensions.get('window').width / 2 - THUMB_HORIZONTAL_MARGIN * 2;
const THUMB_HEIGHT = (Platform.OS === 'ios' ? THUMB_WIDTH * 1.8 : THUMB_WIDTH * 1.45) + THUMB_VERTICAL_MARGIN;
const ROWS_VISIBLE = Math.floor((Dimensions.get('window').height - NAVBAR_SIZE - THUMB_VERTICAL_MARGIN) / THUMB_HEIGHT);
const TABS_VISIBLE = ROWS_VISIBLE * 2;

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
		marginBottom: DeviceSize.isIphoneX() ? 30 : 5,
		paddingVertical: 10
	},
	tabs: {
		flex: 1
	},
	tabsContent: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		padding: 15
	},
	newTabIcon: {
		marginTop: Platform.OS === 'ios' ? 3 : 0,
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

/**
 * Component that wraps all the thumbnails
 * representing all the open tabs
 */
export default class Tabs extends PureComponent {
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
		animateCurrentTab: PropTypes.func // eslint-disable-line react/no-unused-prop-types
	};

	thumbnails = {};

	state = {
		currentTab: null
	};

	scrollview = React.createRef();

	constructor(props) {
		super(props);
		this.createTabsRef(props.tabs);
	}

	componentDidMount() {
		if (this.props.tabs.length > TABS_VISIBLE) {
			// Find the selected index
			let index = 0;
			this.props.tabs.forEach((tab, i) => {
				if (tab.id === this.props.activeTab) {
					index = i;
				}
			});

			// Calculate the row

			const row = Math.ceil((index + 1) / 2);

			// Scroll if needed
			if (row > ROWS_VISIBLE) {
				const pos = (row - 1) * THUMB_HEIGHT;

				InteractionManager.runAfterInteractions(() => {
					this.scrollview.current && this.scrollview.current.scrollTo({ x: 0, y: pos, animated: true });
				});
			}
		}
	}

	createTabsRef(tabs) {
		tabs.forEach(tab => {
			this.thumbnails[tab.id] = React.createRef();
		});
	}

	componentDidUpdate(prevProps) {
		if (prevProps.tabs.length !== Object.keys(this.thumbnails).length) {
			this.createTabsRef(this.props.tabs);
		}
	}

	onSwitch = async tab => {
		this.props.switchToTab(tab);
	};

	renderNoTabs() {
		return (
			<View style={styles.noTabs}>
				<Text style={styles.noTabsTitle}>{strings('browser.no_tabs_title')}</Text>
				<Text style={styles.noTabsDesc}>{strings('browser.no_tabs_desc')}</Text>
			</View>
		);
	}
	renderTabs(tabs, activeTab) {
		return (
			<ScrollView style={styles.tabs} contentContainerStyle={styles.tabsContent} ref={this.scrollview}>
				{tabs.map(tab => (
					// eslint-disable-next-line react/jsx-key
					<TabThumbnail
						ref={this.thumbnails[tab.id]}
						key={tab.id}
						tab={tab}
						isActiveTab={activeTab === tab.id}
						onClose={this.props.closeTab}
						onSwitch={this.onSwitch}
					/>
				))}
			</ScrollView>
		);
	}

	render() {
		const { tabs, activeTab, closeAllTabs, newTab, closeTabsView } = this.props;

		return (
			<View style={styles.tabsView}>
				{tabs.length === 0 ? this.renderNoTabs() : this.renderTabs(tabs, activeTab)}
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
