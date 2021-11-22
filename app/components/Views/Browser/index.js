import React, { useContext, useEffect, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import {
	createNewTab as importedCreateNewTab,
	closeAllTabs as importedCloseAllTabs,
	closeTab as importedClosedTab,
	setActiveTab as importedSetActiveTab,
	updateTab as importedUpdateTab,
} from '../../../actions/browser';
import Tabs from '../../UI/Tabs';
import { getBrowserViewNavbarOptions } from '../../UI/Navbar';
import { captureScreen } from 'react-native-view-shot';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import BrowserTab from '../BrowserTab';
import AppConstants from '../../../core/AppConstants';
import { baseStyles } from '../../../styles/common';
import { DrawerContext } from '../../Nav/Main/MainNavigator';
import { useNavigation } from '@react-navigation/core';
import { useDispatch, useSelector } from 'react-redux';

const margin = 16;
const THUMB_WIDTH = Dimensions.get('window').width / 2 - margin * 2;
const THUMB_HEIGHT = Device.isIos() ? THUMB_WIDTH * 1.81 : THUMB_WIDTH * 1.48;

// interface Props {
// 	/**
// 	 * react-navigation object used to switch between screens
// 	 */
// 	navigation: PropTypes.object,
// 	/**
// 	 * Function to create a new tab
// 	 */
// 	createNewTab: PropTypes.func,
// 	/**
// 	 * Function to close all the existing tabs
// 	 */
// 	closeAllTabs: PropTypes.func,
// 	/**
// 	 * Function to close a specific tab
// 	 */
// 	closeTab: PropTypes.func,
// 	/**
// 	 * Function to set the active tab
// 	 */
// 	setActiveTab: PropTypes.func,
// 	/**
// 	 * Function to set the update the url of a tab
// 	 */
// 	updateTab: PropTypes.func,
// 	/**
// 	 * Array of tabs
// 	 */
// 	tabs: PropTypes.array,
// 	/**
// 	 * ID of the active tab
// 	 */
// 	activeTab: PropTypes.number,
// 	/**
// 	 * Object that represents the current route info like params passed to it
// 	 */
// 	route: PropTypes.object,
// }

/**
 * PureComponent that wraps all the browser
 * individual tabs and the tabs view
 */
const Browser = ({ route }) => {
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const { drawerRef } = useContext(DrawerContext);

	const newTabUrlRef = useRef(undefined);

	const tabs = useSelector((state) => state.browser.tabs);
	const activeTab = useSelector((state) => state.browser.activeTab);
	const createNewTab = (url) => dispatch(importedCreateNewTab(url));
	const triggerCloseAllTabs = () => dispatch(importedCloseAllTabs());
	const triggerCloseTab = (id) => dispatch(importedClosedTab(id));
	const setActiveTab = (id) => dispatch(importedSetActiveTab(id));
	const updateTab = (id, url) => dispatch(importedUpdateTab(id, url));

	useEffect(() => {
		navigation.setOptions(getBrowserViewNavbarOptions(navigation, route, drawerRef));
	}, [navigation, route]);

	// componentDidMount
	useEffect(() => {
		if (!tabs.length) {
			newTab();
		}

		const activeTab = tabs.find((tab) => tab.id === activeTab);
		if (activeTab) {
			switchToTab(activeTab);
		} else {
			tabs.length > 0 && switchToTab(tabs[0]);
		}

		const currentUrl = route.params?.newTabUrl;
		if (currentUrl) goToNewTab(currentUrl);
	}, []);

	useEffect(() => {
		const newTabUrl = route.params?.newTabUrl;
		if (newTabUrlRef.current !== newTabUrl) {
			newTabUrlRef.current = newTabUrl;
			goToNewTab(newTabUrl);
		}
	}, [route.params?.newTabUrl]);

	const goToNewTab = (url) => {
		newTab(url);
		navigation.setParams({
			...route.params,
			newTabUrl: null,
		});
	};

	const showTabs = async () => {
		try {
			const activeTab = tabs.find((tab) => tab.id === activeTab);
			await takeScreenshot(activeTab.url, activeTab.id);
		} catch (e) {
			Logger.error(e);
		}

		navigation.setParams({
			...route.params,
			showTabs: true,
		});
	};

	const hideTabsAndUpdateUrl = (url) => {
		navigation.setParams({
			...route.params,
			showTabs: false,
			url,
			silent: false,
		});
	};

	const closeAllTabs = () => {
		if (tabs.length) {
			triggerCloseAllTabs();
			navigation.setParams({
				...route.params,
				url: null,
				silent: true,
			});
		}
	};

	const newTab = (url) => {
		createNewTab(url || AppConstants.HOMEPAGE_URL);
		setTimeout(() => {
			switchToTab(tabs[tabs.length - 1]);
		}, 100);
	};

	const closeTab = (tab) => {
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
						setActiveTab(newTab.id);
						navigation.setParams({
							...route.params,
							url: newTab.url,
							silent: true,
						});
					}
				});
			} else {
				navigation.setParams({
					...route.params,
					url: null,
					silent: true,
				});
			}
		}

		triggerCloseTab(tab.id);
	};

	const closeTabsView = () => {
		if (tabs.length) {
			navigation.setParams({
				...route.params,
				showTabs: false,
				silent: true,
			});
		}
	};

	const switchToTab = (tab) => {
		setActiveTab(tab.id);
		hideTabsAndUpdateUrl(tab.url);
		updateTabInfo(tab.url, tab.id);
	};

	const renderTabsView = () => {
		const showTabs = route.params?.showTabs;
		if (showTabs) {
			return (
				<Tabs
					tabs={tabs}
					activeTab={activeTab}
					switchToTab={switchToTab}
					newTab={newTab}
					closeTab={closeTab}
					closeTabsView={closeTabsView}
					closeAllTabs={closeAllTabs}
				/>
			);
		}
		return null;
	};

	const updateTabInfo = (url, tabID) =>
		updateTab(tabID, {
			url,
		});

	const takeScreenshot = (url, tabID) =>
		new Promise((resolve, reject) => {
			captureScreen({
				format: 'jpg',
				quality: 0.2,
				THUMB_WIDTH,
				THUMB_HEIGHT,
			}).then(
				(uri) => {
					updateTab(tabID, {
						url,
						image: uri,
					});
					resolve(true);
				},
				(error) => {
					Logger.error(error, `Error saving tab ${url}`);
					reject(error);
				}
			);
		});

	const renderBrowserTabs = () =>
		tabs.map((tab) => (
			<BrowserTab
				id={tab.id}
				key={`tab_${tab.id}`}
				initialUrl={tab.url || AppConstants.HOMEPAGE_URL}
				updateTabInfo={updateTabInfo}
				showTabs={showTabs}
				newTab={newTab}
			/>
		));

	return (
		<View style={baseStyles.flexGrow} testID={'browser-screen'}>
			{renderBrowserTabs()}
			{renderTabsView()}
		</View>
	);
};

export default Browser;
