import React, { PureComponent } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeViewProps {
  /**
   * Determines to show / hide the children components
   */
  visible?: boolean;
  /**
   * Children components of the FadeView
   * it can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children?: React.ReactNode;
  /**
   * Styles to be applied to the FadeView
   */
  style?: ViewStyle;
}

interface FadeViewState {
  visible: boolean;
}

/**
 * View that has the ability to fade in / out
 * his children by using the visible prop
 */
export default class FadeView extends PureComponent<FadeViewProps, FadeViewState> {
  visibility: Animated.Value;
  mounted: boolean;

  constructor(props: FadeViewProps) {
    super(props);
    this.state = {
      visible: props.visible || false,
    };
    this.visibility = new Animated.Value(props.visible ? 1 : 0);
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate() {
    Animated.timing(this.visibility, {
      toValue: this.props.visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      isInteraction: false,
    }).start(() => {
      if (this.props.visible !== this.state.visible) {
        setTimeout(() => {
          this.mounted && this.setState({ visible: this.props.visible || false });
        }, 500);
      }
    });
  }

  render = () => {
    const { style, children, ...rest } = this.props;

    const containerStyle = {
      opacity: this.visibility.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    };

    const combinedStyle = [containerStyle, style];
    return (
      <Animated.View
        style={this.state.visible ? combinedStyle : containerStyle}
        {...rest}
      >
        {this.state.visible ? children : null}
      </Animated.View>
    );
  };
}
