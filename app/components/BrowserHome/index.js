import React, { Component } from 'react';
import { AppState } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import getNavbarOptions from '../Navbar';
import HomePage from '../HomePage';
import onUrlSubmit from '../../util/browser';
import Feedback from '../../core/Feedback';
import AppConstants from '../../core/AppConstants';
import DeeplinkManager from '../../core/DeeplinkManager';
import Branch from 'react-native-branch';
import Logger from '../../util/Logger';
import SecureKeychain from '../../core/SecureKeychain';

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
		Branch.subscribe(this.handleDeeplinks);
		AppState.addEventListener('change', this.handleAppStateChange);
		this.feedback = new Feedback({
			action: () => {
				this.props.navigation.push('BrowserView', { url: AppConstants.FEEDBACK_URL });
			}
		});
	}

	handleAppStateChange = async nextAppState => {
		// Don't auto-lock
		if (this.props.lockTime === -1) {
			return;
		}

		if (nextAppState !== 'active') {
			// Auto-lock immediately
			if (this.props.lockTime === 0) {
				this.lockWallet();
			} else {
				// Autolock after some time
				this.lockTimer = setTimeout(() => {
					if (this.lockTimer) {
						this.lockWallet();
					}
				}, this.props.lockTime);
			}
		} else if (this.state.appState !== 'active' && nextAppState === 'active') {
			// Prevent locking since it didnt reach the time threshold
			if (this.lockTimer) {
				clearTimeout(this.lockTimer);
				this.lockTimer = null;
			}
		}

		this.mounted && this.setState({ appState: nextAppState });
	};

	lockWallet() {
		if (!SecureKeychain.getInstance().isAuthenticating) {
			this.mounted && this.props.navigation.navigate('LockScreen', { backgroundMode: true });
			this.locked = true;
		} else if (this.lockTimer) {
			clearTimeout(this.lockTimer);
			this.lockTimer = null;
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.feedback.stopListening();
		AppState.removeEventListener('change', this.handleAppStateChange);
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

	render = () => <HomePage onBookmarkTapped={this.go} onInitialUrlSubmit={this.onInitialUrlSubmit} />;
}

const mapStateToProps = state => ({
	searchEngine: state.settings.searchEngine,
	lockTime: state.settings.lockTime
});

export default connect(mapStateToProps)(BrowserHome);
