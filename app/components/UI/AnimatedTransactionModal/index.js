import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Animated, Easing } from 'react-native';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      minHeight: 200,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 24 : 0,
    },
    transactionEdit: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    transactionReview: {
      paddingTop: 24,
    },
  });

//This is a placeholder to represent the custom gas modal.
//TODO this custom gas modal needs to be removed from the animated tx modal.
const customGasHeightPlaceHolder = 400;

/**
 * PureComponent that handles most of the animation/transition logic
 */
class AnimatedTransactionModal extends PureComponent {
  static propTypes = {
    /**
     * Changes the mode to 'review'
     */
    review: PropTypes.func,
    /**
     * Called when a user changes modes
     */
    onModeChange: PropTypes.func,
    /**
     * Whether or not basic gas estimates have been fetched
     */
    ready: PropTypes.bool,
    /**
     * Children components
     */
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
    ]).isRequired,
  };

  state = {
    originComponent:
      React.Children.toArray(this.props?.children).length > 1
        ? 'dapp'
        : 'wallet',
    modalValue:
      React.Children.toArray(this.props?.children).length > 1
        ? new Animated.Value(1)
        : new Animated.Value(0),
    width: Device.getDeviceWidth(),
    rootHeight: null,
    customGasHeight: customGasHeightPlaceHolder,
    transactionReviewDataHeight: null,
    hideGasSelectors: false,
    hideData: true,
    advancedCustomGas: false,
    toAdvancedFrom: 'edit',
    mode: 'review',
  };

  reviewToEditValue = new Animated.Value(0);
  reviewToDataValue = new Animated.Value(0);
  editToAdvancedValue = new Animated.Value(0);

  xTranslationMappings = {
    reviewToEdit: this.reviewToEditValue,
    editToAdvanced: this.editToAdvancedValue,
    reviewToData: this.reviewToDataValue,
  };

  review = () => {
    this.props.review();
    this.onModeChange('review');
  };

  onModeChange = (mode) => {
    if (mode === 'edit') {
      this.setState({ toAdvancedFrom: 'review' });
      this.animate({
        modalEndValue: this.state.advancedCustomGas
          ? this.getAnimatedModalValueForAdvancedCG()
          : 0,
        xTranslationName: 'reviewToEdit',
        xTranslationEndValue: 1,
      });
    } else {
      this.animate({
        modalEndValue: 1,
        xTranslationName: 'reviewToEdit',
        xTranslationEndValue: 0,
      });
    }
    this.props.onModeChange(mode);
  };

  animate = ({ modalEndValue, xTranslationName, xTranslationEndValue }) => {
    const { modalValue } = this.state;
    this.hideComponents(xTranslationName, xTranslationEndValue, 'start');
    Animated.parallel([
      Animated.timing(modalValue, {
        toValue: modalEndValue,
        duration: 250,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(this.xTranslationMappings[xTranslationName], {
        toValue: xTranslationEndValue,
        duration: 250,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => {
      this.hideComponents(xTranslationName, xTranslationEndValue, 'end');
    });
  };

  toggleAdvancedCustomGas = (toggle = false) => {
    const { advancedCustomGas } = this.state;
    this.setState({
      advancedCustomGas: toggle ? true : !advancedCustomGas,
      toAdvancedFrom: 'edit',
    });
  };

  hideComponents = (xTranslationName, xTranslationEndValue, animationTime) => {
    //data view is hidden by default because when we switch from review to edit, since view is nested in review, it also gets transformed. It's shown if it's the animation's destination.
    if (xTranslationName === 'editToAdvanced') {
      this.setState({
        hideGasSelectors: xTranslationEndValue === 1 && animationTime === 'end',
      });
    }
    if (xTranslationName === 'reviewToData') {
      this.setState({
        hideData: xTranslationEndValue === 0 && animationTime === 'end',
      });
    }
  };

  generateTransform = (valueType, outRange) => {
    const { modalValue } = this.state;
    if (valueType === 'modal' || valueType === 'saveButton') {
      return {
        transform: [
          {
            translateY: modalValue.interpolate({
              inputRange: [
                0,
                valueType === 'saveButton'
                  ? this.getAnimatedModalValueForAdvancedCG()
                  : 1,
              ],
              outputRange: outRange,
            }),
          },
        ],
      };
    }
    let value;
    if (valueType === 'reviewToEdit') value = this.reviewToEditValue;
    else if (valueType === 'editToAdvanced') value = this.editToAdvancedValue;
    else if (valueType === 'reviewToData') value = this.reviewToDataValue;
    return {
      transform: [
        {
          translateX: value.interpolate({
            inputRange: [0, 1],
            outputRange: outRange,
          }),
        },
      ],
    };
  };

  getAnimatedModalValueForAdvancedCG = () => {
    const { rootHeight, customGasHeight, originComponent } = this.state;
    if (originComponent === 'wallet') return 1;
    //70 is the fixed height + margin of the error message in advanced custom gas. It expands 70 units vertically to accomodate it
    return 70 / (rootHeight - customGasHeight);
  };

  saveRootHeight = (event) =>
    this.setState({ rootHeight: event.nativeEvent.layout.height });

  saveCustomGasHeight = (event) =>
    this.setState({ customGasHeight: event.nativeEvent.layout.height });

  saveTransactionReviewDataHeight = (event) =>
    !this.state.transactionReviewDataHeight &&
    this.setState({
      transactionReviewDataHeight: event.nativeEvent.layout.height,
    });

  getTransformValue = () => {
    const { rootHeight, customGasHeight } = this.state;
    return rootHeight - customGasHeight;
  };

  render = () => {
    const {
      width,
      hideData,
      originComponent,
      customGasHeight,
      advancedCustomGas,
      hideGasSelectors,
      toAdvancedFrom,
    } = this.state;
    const { ready, children } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const components = React.Children.toArray(children);
    let gasTransformStyle;
    let modalTransformStyle;
    let gasComponent;
    if (originComponent === 'dapp') {
      gasTransformStyle = this.generateTransform('reviewToEdit', [width, 0]);
      modalTransformStyle = this.generateTransform('modal', [
        this.getTransformValue(),
        0,
      ]);
      gasComponent = components[1];
    } else {
      gasTransformStyle = this.generateTransform('reviewToEdit', [0, -width]);
      modalTransformStyle = this.generateTransform('modal', [70, 0]);
      gasComponent = components[0];
    }

    return (
      <Animated.View
        style={[
          styles.root,
          modalTransformStyle,
          originComponent === 'wallet' && { height: customGasHeight + 70 },
        ]}
        onLayout={this.saveRootHeight}
      >
        {originComponent === 'dapp' && (
          <Animated.View
            style={[
              this.generateTransform('reviewToEdit', [0, -width]),
              styles.transactionReview,
            ]}
          >
            {React.cloneElement(components[0], {
              ...components[0].props,
              customGasHeight,
              hideData,
              generateTransform: this.generateTransform,
              animate: this.animate,
              saveTransactionReviewDataHeight:
                this.saveTransactionReviewDataHeight,
              onModeChange: this.onModeChange,
            })}
          </Animated.View>
        )}

        {ready && (
          <Animated.View style={[styles.transactionEdit, gasTransformStyle]}>
            {React.cloneElement(gasComponent, {
              ...gasComponent.props,
              advancedCustomGas,
              hideGasSelectors,
              toAdvancedFrom,
              onModeChange: this.onModeChange,
              toggleAdvancedCustomGas: this.toggleAdvancedCustomGas,
              saveCustomGasHeight: this.saveCustomGasHeight,
              animate: this.animate,
              generateTransform: this.generateTransform,
              getAnimatedModalValueForAdvancedCG:
                this.getAnimatedModalValueForAdvancedCG,
              review: this.review,
            })}
          </Animated.View>
        )}
      </Animated.View>
    );
  };
}

AnimatedTransactionModal.contextType = ThemeContext;

export default AnimatedTransactionModal;
