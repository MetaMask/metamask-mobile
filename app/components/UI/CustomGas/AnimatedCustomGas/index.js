import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getRenderableEthGasFee, getRenderableFiatGasFee, apiEstimateModifiedToWEI } from '../../../util/custom-gas';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { BN } from 'ethereumjs-util';
import { fromWei, renderWei, hexToBN, isDecimal, isBN } from '../../../util/number';
import { getTicker, getNormalizedTxState } from '../../../util/transactions';
import { safeToChecksumAddress } from '../../../util/address';
import Radio from '../Radio';
import StyledButton from '../../UI/StyledButton';
import Device from '../../../util/Device';

/**
 * PureComponent that handles most of the animation/transition logic 
 */
class AnimatedCustomGas extends PureComponent {
  static propTypes = {
    /**
     * List of accounts from the AccountTrackerController
     */
    accounts: PropTypes.object,
  };

  state = {
    modalValue: new Animated.Value(1),
    reviewToEditValue: new Animated.Value(0),
    reviewToDataValue: new Animated.Value(0),
    editToAdvancedValue: new Animated.Value(0),
    width: Device.getDeviceWidth(),
    rootHeight: null,
    customGasHeight: null,
    transactionReviewDataHeight: null,
    hideGasSelectors: false,
    hideData: true,
    toAdvancedFrom: 'edit',
    mode: 'review'
  };

  xTranslationMappings = {
    reviewToEdit: this.state.reviewToEditValue,
    editToAdvanced: this.state.editToAdvancedValue,
    reviewToData: this.state.reviewToDataValue
  };

  onModeChange = mode => {
    if (mode === 'edit') {
      this.setState({ toAdvancedFrom: 'review' });
      this.animate({
        modalEndValue: this.state.advancedCustomGas ? this.getAnimatedModalValueForAdvancedCG() : 0,
        xTranslationName: 'reviewToEdit',
        xTranslationEndValue: 1
      });
    } else {
      this.animate({
        modalEndValue: 1,
        xTranslationName: 'reviewToEdit',
        xTranslationEndValue: 0
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
        useNativeDriver: true
      }),
      Animated.timing(this.xTranslationMappings[xTranslationName], {
        toValue: xTranslationEndValue,
        duration: 250,
        easing: Easing.ease,
        useNativeDriver: true
      })
    ]).start(() => {
      this.hideComponents(xTranslationName, xTranslationEndValue, 'end');
    });
  };

  hideComponents = (xTranslationName, xTranslationEndValue, animationTime) => {
    //data view is hidden by default because when we switch from review to edit, since view is nested in review, it also gets transformed. It's shown if it's the animation's destination.
    if (xTranslationName === 'editToAdvanced') {
      this.setState({
        hideGasSelectors: xTranslationEndValue === 1 && animationTime === 'end'
      });
    }
    if (xTranslationName === 'reviewToData') {
      this.setState({
        hideData: xTranslationEndValue === 0 && animationTime === 'end'
      });
    }
  };

  generateTransform = (valueType, outRange) => {
    const { modalValue, reviewToEditValue, editToAdvancedValue, reviewToDataValue } = this.state;
    if (valueType === 'modal' || valueType === 'saveButton') {
      return {
        transform: [
          {
            translateY: modalValue.interpolate({
              inputRange: [0, valueType === 'saveButton' ? this.getAnimatedModalValueForAdvancedCG() : 1],
              outputRange: outRange
            })
          }
        ]
      };
    }
    let value;
    if (valueType === 'reviewToEdit') value = reviewToEditValue;
    else if (valueType === 'editToAdvanced') value = editToAdvancedValue;
    else if (valueType === 'reviewToData') value = reviewToDataValue;
    return {
      transform: [
        {
          translateX: value.interpolate({
            inputRange: [0, 1],
            outputRange: outRange
          })
        }
      ]
    };
  };

  getAnimatedModalValueForAdvancedCG = () => {
    const { rootHeight, customGasHeight } = this.state;
    //70 is the fixed height + margin of the error message in advanced custom gas. It expands 70 units vertically to accomodate it
    return 70 / (rootHeight - customGasHeight);
  };

  saveRootHeight = event => this.setState({ rootHeight: event.nativeEvent.layout.height });

  saveCustomGasHeight = event =>
    !this.state.customGasHeight && this.setState({ customGasHeight: event.nativeEvent.layout.height });

  saveTransactionReviewDataHeight = event =>
    !this.state.transactionReviewDataHeight &&
    this.setState({ transactionReviewDataHeight: event.nativeEvent.layout.height });

  getTransformValue = () => {
    const { rootHeight, customGasHeight } = this.state;
    return rootHeight - customGasHeight;
  };


  render = () => {
    let buttonStyle;

    if (toAdvancedFrom === 'edit' && mode === 'edit') {
      buttonStyle = generateTransform('saveButton', [0, 70]);
    } else if (advancedCustomGas) {
      buttonStyle = styles.buttonTransform;
    }

    return (
      <>
      {this.props.children}
      </>
    );
  };
}

const mapStateToProps = state => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  transaction: getNormalizedTxState(state)
});

export default connect(mapStateToProps)(CustomGas);
