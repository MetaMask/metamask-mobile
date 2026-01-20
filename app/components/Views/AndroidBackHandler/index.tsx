import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
import { PureComponent } from 'react';
import { BackHandler, InteractionManager } from 'react-native';

interface AndroidBackHandlerProps {
  /**
   * react-navigation object used to switch between screens
   */
  navigation?: NavigationProp<RootParamList>;
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
    return undefined;
  };

  render() {
    return null;
  }
}
