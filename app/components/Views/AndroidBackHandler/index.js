import { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { BackHandler, InteractionManager } from 'react-native';

/**
 * PureComponent that handles android hardware back button
 */
export default class AndroidBackHandler extends PureComponent {
  static propTypes = {
    /**
     * react-navigation object used to switch between screens
     */
    navigation: PropTypes.object,
    /**
     * Custom callback to call on back press event
     */
    customBackPress: PropTypes.func,
  };

  pressed = false;

  componentDidMount() {
    InteractionManager.runAfterInteractions(() => {
      BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    });
  }

  componentWillUnmount() {
    InteractionManager.runAfterInteractions(() => {
      BackHandler.removeEventListener(
        'hardwareBackPress',
        this.handleBackPress,
      );
    });
  }

  handleBackPress = () => {
    const { navigation, customBackPress } = this.props;

    if (!this.pressed) {
      this.pressed = true;
      if (customBackPress) {
        customBackPress();
      } else {
        navigation && navigation.goBack();
      }
      setTimeout(() => (this.pressed = false), 300);
    }
  };

  render() {
    return null;
  }
}
