import React, { Component } from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import getNavbarOptions from '../../UI/Navbar';
import HomePage from '../../UI/HomePage';
import onUrlSubmit from '../../../util/browser';
import Feedback from '../../../core/Feedback';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Branch from 'react-native-branch';
import Logger from '../../../util/Logger';
import { PendingTransactionNotification } from '../../UI/PendingTransactionNotification';
// eslint-disable-next-line import/no-unresolved
import LockManager from '../../../core/LockManager';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { baseStyles } from '../../../styles/common';

/**
 * Complete Web browser component with URL entry and history management
 */
class BrowserHome extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('ÐApp Browser', navigation);

	static defaultProps = {
		defaultProtocol: 'https://'
	};

	static propTypes = {
		/**
		 * Protocol string to append to URLs that have none
		 */
		defaultProtocol: PropTypes.string,
		/**
		 * Initial URL to load in the WebView
		 */
		defaultURL: PropTypes.string,
		/**
		 * Active search engine
		 */
		searchEngine: PropTypes.string,
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Time to auto-lock the app after it goes in background mode
		 */
		lockTime: PropTypes.number
	};

	state = {
		url: this.props.defaultURL || '',
		tabs: []
	};

	mounted = false;
	lockTimer = null;

	componentDidMount() {
		this.mounted = true;
		if (!__DEV__) {
			Branch.subscribe(this.handleDeeplinks);
		}
		this.lockManager = new LockManager(this.props.navigation, this.props.lockTime);
		this.feedback = new Feedback({
			action: () => {
				this.props.navigation.push('BrowserView', { url: AppConstants.FEEDBACK_URL });
			}
		});

		setTimeout(() => {
			showMessage({
				message: 'Simple message',
				type: 'info'
			});
		}, 3000);
	}

	componentDidUpdate(prevProps) {
		if (this.props.lockTime !== prevProps.lockTime) {
			this.lockManager.updateLockTime(this.props.lockTime);
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.feedback.stopListening();
		this.lockManager.stopListening();
	}

	handleDeeplinks = async ({ error, params }) => {
		if (error) {
			Logger.error('Error from Branch: ', error);
			return;
		}
		if (params['+non_branch_link']) {
			const dm = new DeeplinkManager(this.props.navigation);
			dm.parse(params['+non_branch_link']);
		}
	};

	go = async url => {
		this.setState({ tabs: [...this.state.tabs, url] });
		this.props.navigation.navigate('BrowserView', { url });
	};

	onInitialUrlSubmit = async url => {
		if (url === '') {
			return false;
		}
		const { defaultProtocol, searchEngine } = this.props;
		const sanitizedInput = onUrlSubmit(url, searchEngine, defaultProtocol);
		await this.go(sanitizedInput);
	};

	render = () => (
		<View style={baseStyles.flexGrow}>
			<HomePage goTo={this.go} onInitialUrlSubmit={this.onInitialUrlSubmit} navigation={this.props.navigation} />
			<FlashMessage duration={5000} position="bottom" MessageComponent={PendingTransactionNotification} />
		</View>
	);
}

const mapStateToProps = state => ({
	searchEngine: state.settings.searchEngine,
	lockTime: state.settings.lockTime
});

export default connect(mapStateToProps)(BrowserHome);
