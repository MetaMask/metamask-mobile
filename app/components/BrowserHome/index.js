import React, { Component } from 'react';
import PropTypes from 'prop-types';
import getNavbarOptions from '../Navbar';
import HomePage from '../HomePage';

/**
 * Complete Web browser component with URL entry and history management
 */
export default class BrowserHome extends Component {
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
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object
	};

	state = {
		url: this.props.defaultURL || '',
		tabs: []
	};

	async componentDidMount() {
		this.checkForDeeplinks();
	}

	checkForDeeplinks() {
		const { navigation } = this.props;
		if (navigation) {
			const url = navigation.getParam('url', null);
			if (url) {
				this.go(url);
			}
		}
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;

		if (prevNavigation && navigation) {
			const prevUrl = prevNavigation.getParam('url', null);
			const currentUrl = navigation.getParam('url', null);

			if (currentUrl && prevUrl !== currentUrl) {
				this.checkForDeeplinks();
			}
		}
	}

	go = async url => {
		this.setState({ tabs: [...this.state.tabs, url] });
		this.props.navigation.navigate('BrowserView', { url });
	};

	onInitialUrlSubmit = async url => {
		if (url === '') {
			return false;
		}

		//Check if it's a url or a keyword
		const res = url.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!&',;=.]+$/g);
		if (res === null) {
			// In case of keywords we default to google search
			this.go('https://www.google.com/search?q=' + escape(url));
		} else {
			const hasProtocol = url.match(/^[a-z]*:\/\//);
			const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
			await this.go(sanitizedURL);
		}
	};

	render = () => <HomePage onBookmarkTapped={this.go} onInitialUrlSubmit={this.onInitialUrlSubmit} />;
}
