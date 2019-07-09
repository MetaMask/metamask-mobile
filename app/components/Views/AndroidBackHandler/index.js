import { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { BackHandler } from 'react-native';

/**
 * Component that handles android hardware back button
 */
export default class AndroidBackHandler extends PureComponent {
	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object
	};

	componentDidMount() {
		BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
	}

	handleBackPress = () => {
		const { navigation } = this.props;
		navigation && navigation.goBack();
	};

	render() {
		return null;
	}
}
