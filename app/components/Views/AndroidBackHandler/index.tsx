import { PureComponent } from 'react';
import { BackHandler, InteractionManager } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

interface AndroidBackHandlerProps {
  navigation?: NavigationProp<any>;
  customBackPress?: (() => void) | undefined;
}

/**
 * PureComponent that handles android hardware back button
 */
export default class AndroidBackHandler extends PureComponent<AndroidBackHandlerProps> {
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
        navigation?.goBack();
      }
      setTimeout(() => (this.pressed = false), 300);
    }
    return true;
  };

  render() {
    return null;
  }
}
