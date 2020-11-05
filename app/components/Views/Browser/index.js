import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { View, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import { createNewTab, closeAllTabs, closeTab, setActiveTab, updateTab } from '../../../actions/browser';
import Tabs from '../../UI/Tabs';
import { getBrowserViewNavbarOptions } from '../../UI/Navbar';
import { captureScreen } from 'react-native-view-shot';
import Logger from '../../../util/Logger';
import Device from '../../../util/Device';
import BrowserTab from '../BrowserTab';
import AppConstants from '../../../core/AppConstants';
import { baseStyles } from '../../../styles/common';

const margin = 16;
const THUMB_WIDTH = Dimensions.get('window').width / 2 - margin * 2;
const THUMB_HEIGHT = Device.isIos() ? THUMB_WIDTH * 1.81 : THUMB_WIDTH * 1.48;

/**
 * PureComponent that wraps all the browser
 * individual tabs and the tabs view
 */
class Browser extends PureComponent {
	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Function to create a new tab
		 */
		createNewTab: PropTypes.func,
		/**
		 * Function to close all the existing tabs
		 */
		closeAllTabs: PropTypes.func,
		/**
		 * Function to close a specific tab
		 */
		closeTab: PropTypes.func,
		/**
		 * Function to set the active tab
		 */
		setActiveTab: PropTypes.func,
		/**
		 * Function to set the update the url of a tab
		 */
		updateTab: PropTypes.func,
		/**
		 * Array of tabs
		 */
		tabs: PropTypes.array,
		/**
		 * ID of the active tab
		 */
		activeTab: PropTypes.number
	};
	static navigationOptions = ({ navigation }) => getBrowserViewNavbarOptions(navigation);

	constructor(props) {
		super(props);

		if (!props.tabs.length) {
			this.newTab();
		}
	}
	componentDidMount() {
		const activeTab = this.props.tabs.find(tab => tab.id === this.props.activeTab);
		if (activeTab) {
			this.switchToTab(activeTab);
		} else {
			this.props.tabs.length > 0 && this.switchToTab(this.props.tabs[0]);
		}

		const currentUrl = this.props.navigation.getParam('newTabUrl', null);
		if (currentUrl) this.goToNewTab(currentUrl);
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;

		if (prevNavigation && navigation) {
			const prevUrl = prevNavigation.getParam('newTabUrl', null);
			const currentUrl = navigation.getParam('newTabUrl', null);

			if (currentUrl && prevUrl !== currentUrl) {
				this.goToNewTab(currentUrl);
			}
		}
	}

	goToNewTab = url => {
		this.newTab(url);
		this.props.navigation.setParams({
			...this.props.navigation.state.params,
			newTabUrl: null
		});
	};

	showTabs = async () => {
		try {
			const activeTab = this.props.tabs.find(tab => tab.id === this.props.activeTab);
			await this.takeScreenshot(activeTab.url, activeTab.id);
		} catch (e) {
			Logger.error(e);
		}

		this.props.navigation.setParams({
			...this.props.navigation.state.params,
			showTabs: true
		});
	};

	hideTabsAndUpdateUrl = url => {
		this.props.navigation.setParams({
			...this.props.navigation.state.params,
			showTabs: false,
			url,
			silent: false
		});
	};

	closeAllTabs = () => {
		if (this.props.tabs.length) {
			this.props.closeAllTabs();
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				url: null,
				silent: true
			});
		}
	};

	newTab = url => {
		this.props.createNewTab(url || AppConstants.HOMEPAGE_URL);
		setTimeout(() => {
			const { tabs } = this.props;
			this.switchToTab(tabs[tabs.length - 1]);
		}, 100);
	};

	closeTab = tab => {
		const { activeTab, tabs } = this.props;

		// If the tab was selected we have to select
		// the next one, and if there's no next one,
		// we select the previous one.
		if (tab.id === activeTab) {
			if (tabs.length > 1) {
				tabs.forEach((t, i) => {
					if (t.id === tab.id) {
						let newTab = tabs[i - 1];
						if (tabs[i + 1]) {
							newTab = tabs[i + 1];
						}
						this.props.setActiveTab(newTab.id);
						this.props.navigation.setParams({
							...this.props.navigation.state.params,
							url: newTab.url,
							silent: true
						});
					}
				});
			} else {
				this.props.navigation.setParams({
					...this.props.navigation.state.params,
					url: null,
					silent: true
				});
			}
		}

		this.props.closeTab(tab.id);
	};

	closeTabsView = () => {
		if (this.props.tabs.length) {
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				showTabs: false,
				silent: true
			});
		}
	};

	switchToTab = tab => {
		this.props.setActiveTab(tab.id);
		this.hideTabsAndUpdateUrl(tab.url);
		this.updateTabInfo(tab.url, tab.id);
	};

	renderTabsView() {
		const { tabs, activeTab } = this.props;
		const showTabs = this.props.navigation.getParam('showTabs', false);
		if (showTabs) {
			return (
				<Tabs
					tabs={tabs}
					activeTab={activeTab}
					switchToTab={this.switchToTab}
					newTab={this.newTab}
					closeTab={this.closeTab}
					closeTabsView={this.closeTabsView}
					closeAllTabs={this.closeAllTabs}
				/>
			);
		}
		return null;
	}

	updateTabInfo = (url, tabID) =>
		this.props.updateTab(tabID, {
			url
		});

	takeScreenshot = (url, tabID) =>
		new Promise((resolve, reject) => {
			captureScreen({
				format: 'jpg',
				quality: 0.2,
				THUMB_WIDTH,
				THUMB_HEIGHT
			}).then(
				uri => {
					const { updateTab } = this.props;

					updateTab(tabID, {
						url,
						image: uri
					});
					resolve(true);
				},
				error => {
					Logger.error(error, `Error saving tab ${url}`);
					reject(error);
				}
			);
		});

	renderBrowserTabs = () =>
		this.props.tabs.map(tab => (
			<BrowserTab
				id={tab.id}
				key={`tab_${tab.id}`}
				initialUrl={tab.url || AppConstants.HOMEPAGE_URL}
				updateTabInfo={this.updateTabInfo}
				showTabs={this.showTabs}
				newTab={this.newTab}
			/>
		));

	render() {
		return (
			<View style={baseStyles.flexGrow} testID={'browser-screen'}>
				{this.renderBrowserTabs()}
				{this.renderTabsView()}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	tabs: state.browser.tabs,
	activeTab: state.browser.activeTab
});

const mapDispatchToProps = dispatch => ({
	createNewTab: url => dispatch(createNewTab(url)),
	closeAllTabs: () => dispatch(closeAllTabs()),
	closeTab: id => dispatch(closeTab(id)),
	setActiveTab: id => dispatch(setActiveTab(id)),
	updateTab: (id, url) => dispatch(updateTab(id, url))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Browser);
