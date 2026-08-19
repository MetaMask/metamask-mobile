import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { PureComponent } from 'react';
import { BackHandler, InteractionManager } from 'react-native';

interface AndroidBackHandlerProps {
  /**
   * react-navigation object used to switch between screens
   */
  navigation?: NavigationProp<ParamListBase>;
  /**
   * Custom callback to call on back press event
   */
  customBackPress: () => void;
}

/**
 * PureComponent that handles android hardware back button
 */
export default class AndroidBackHandler extends PureComponent<AndroidBackHandlerProps> {
  pressed = false;
  backHandlerSubscription?: { remove: () => void };

  componentDidMount() {
    InteractionManager.runAfterInteractions(() => {
      this.backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        this.handleBackPress,
      );
    });
  }

  componentWillUnmount() {
    InteractionManager.runAfterInteractions(() => {
      this.backHandlerSubscription?.remove();
      this.backHandlerSubscription = undefined;
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
    return undefined;
  };

  render() {
    return null;
  }
}
