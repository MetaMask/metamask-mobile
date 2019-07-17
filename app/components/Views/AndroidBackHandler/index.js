import { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { BackHandler, InteractionManager } from 'react-native';

/**
 * Component that handles android hardware back button
 */
export default class AndroidBackHandler extends PureComponent {
	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		customBackPress: PropTypes.func
	};

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
		});
	}

	componentWillUnmount() {
		InteractionManager.runAfterInteractions(() => {
			BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
		});
	}

	handleBackPress = () => {
		const { navigation, customBackPress } = this.props;
		if (customBackPress) {
			customBackPress();
		} else {
			navigation && navigation.goBack();
		}
	};

	render() {
		return null;
	}
}
