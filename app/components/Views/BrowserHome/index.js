import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import HomePage from '../../UI/HomePage';
import onUrlSubmit from '../../../util/browser';

/**
 * Complete Web browser component with URL entry and history management
 */
class BrowserHome extends Component {
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
		goToUrl: PropTypes.func
	};

	state = {
		url: this.props.defaultURL || ''
	};

	mounted = false;
	lockTimer = null;

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	go = async url => {
		this.props.goToUrl(url);
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
		<HomePage goTo={this.go} onInitialUrlSubmit={this.onInitialUrlSubmit} navigation={this.props.navigation} />
	);
}

const mapStateToProps = state => ({
	searchEngine: state.settings.searchEngine
});

export default connect(mapStateToProps)(BrowserHome);
