import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';

import { store, persistor } from '../../../store/';
import SplashScreen from 'react-native-splash-screen';
import Branch from 'react-native-branch';

import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
import ErrorBoundary from '../ErrorBoundary';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
export default class Root extends PureComponent {
	static propTypes = {
		foxCode: PropTypes.string,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	static defaultProps = {
		foxCode: 'null'
	};

	unsubscribeFromBranch;

	errorHandler = (error, stackTrace) => {
		Logger.error(error, stackTrace);
	};

	constructor(props) {
		super(props);
		SecureKeychain.init(props.foxCode);
		// Init EntryScriptWeb3 asynchronously on the background
		EntryScriptWeb3.init();
		SplashScreen.hide();
	}

	handleDeeplinks = async ({ error, params, uri }) => {
		if (error) {
			Logger.error(error, 'Deeplink: Error from Branch');
		}
		const deeplink = params['+non_branch_link'] || uri || null;
		try {
			if (deeplink) {
				const { KeyringController } = Engine.context;
				const isUnlocked = KeyringController.isUnlocked();
				isUnlocked
					? SharedDeeplinkManager.parse(deeplink, { origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK })
					: SharedDeeplinkManager.setDeeplink(deeplink);
			}
		} catch (e) {
			Logger.error(e, `Deeplink: Error parsing deeplink`);
		}
	};

	componentDidMount = () => {
		SharedDeeplinkManager.init(this.props.navigation);
		this.unsubscribeFromBranch = Branch.subscribe(this.handleDeeplinks);
	};

	componentWillUnmount = () => {
		this.unsubscribeFromBranch && this.unsubscribeFromBranch();
	};

	render = () => (
		<Provider store={store}>
			<PersistGate persistor={persistor}>
				<ErrorBoundary onError={this.errorHandler} view="Root">
					<App />
				</ErrorBoundary>
			</PersistGate>
		</Provider>
	);
}
