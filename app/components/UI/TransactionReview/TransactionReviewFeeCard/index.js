import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Summary from '../../../Base/Summary';
import Text from '../../../Base/Text';
import InfoModal from '../../../UI/Swaps/components/InfoModal';
import { isMainnetByChainId } from '../../../../util/networks';
import { connect } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FadeAnimationView from '../../FadeAnimationView';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    overview: {
      marginHorizontal: 24,
    },
    loader: {
      backgroundColor: colors.background.default,
      height: 10,
      flex: 1,
      alignItems: 'flex-end',
    },
    over: {
      color: colors.error.default,
    },
    valuesContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    gasInfoContainer: {
      paddingHorizontal: 2,
    },
    gasInfoIcon: {
      color: colors.primary.default,
    },
    amountContainer: {
      flex: 1,
    },
    gasFeeTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    primaryContainer: (flex) => {
      if (flex) return { flex: 1 };
      return { width: 86, marginLeft: 2 };
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
  });

/**
 * PureComponent that displays a transaction's fee and total details inside a card
 */
class TransactionReviewFeeCard extends PureComponent {
  static propTypes = {
    /**
     * True if gas estimation for a transaction is complete
     */
    gasEstimationReady: PropTypes.bool,
    /**
     * Total gas fee in fiat
     */
    totalGasFiat: PropTypes.string,
    /**
     * Total gas fee in ETH
     */
    totalGasEth: PropTypes.string,
    /**
     * Total transaction value in fiat
     */
    totalFiat: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
      PropTypes.string,
    ]),
    /**
     * Transaction value in fiat before gas fee
     */
    fiat: PropTypes.string,
    /**
     * Total transaction value in ETH
     */
    totalValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    /**
     * Transaction value in ETH before gas fee
     */
    transactionValue: PropTypes.string,
    /**
     * ETH or fiat, dependent on user setting
     */
    primaryCurrency: PropTypes.string,
    /**
     * Changes mode to edit
     */
    edit: PropTypes.func,
    /**
     * True if transaction is over the available funds
     */
    over: PropTypes.bool,
    /**
     * True if transaction is gas price is higher than the "FAST" value
     */
    warningGasPriceHigh: PropTypes.string,
    /**
     * A string representing the network chainId
     */
    chainId: PropTypes.string,
    /**
     * Function to call when update animation starts
     */
    onUpdatingValuesStart: PropTypes.func,
    /**
     * Function to call when update animation ends
     */
    onUpdatingValuesEnd: PropTypes.func,
    /**
     * If the values should animate upon update or not
     */
    animateOnChange: PropTypes.bool,
    /**
     * Boolean to determine if the animation is happening
     */
    isAnimating: PropTypes.bool,
  };

  state = {
    showGasTooltip: false,
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderIfGasEstimationReady = (children) => {
    const { gasEstimationReady } = this.props;
    const styles = this.getStyles();

    return !gasEstimationReady ? (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    ) : (
      children
    );
  };

  openLinkAboutGas = () =>
    Linking.openURL(
      'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172',
    );

  toggleGasTooltip = () =>
    this.setState((state) => ({ showGasTooltip: !state.showGasTooltip }));

  renderGasTooltip = () => {
    const isMainnet = isMainnetByChainId(this.props.chainId);
    return (
      <InfoModal
        isVisible={this.state.showGasTooltip}
        title={strings(
          `transaction.gas_education_title${isMainnet ? '_ethereum' : ''}`,
        )}
        toggleModal={this.toggleGasTooltip}
        body={
          <View>
            <Text grey infoModal>
              {strings('transaction.gas_education_1')}
              {strings(
                `transaction.gas_education_2${isMainnet ? '_ethereum' : ''}`,
              )}{' '}
              <Text bold>{strings('transaction.gas_education_3')}</Text>
            </Text>
            <Text grey infoModal>
              {strings('transaction.gas_education_4')}
            </Text>
            <TouchableOpacity onPress={this.openLinkAboutGas}>
              <Text grey link infoModal>
                {strings('transaction.gas_education_learn_more')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  render() {
    const {
      totalGasFiat,
      totalGasEth,
      totalFiat,
      fiat,
      totalValue,
      transactionValue,
      primaryCurrency,
      edit,
      over,
      warningGasPriceHigh,
      chainId,
      onUpdatingValuesStart,
      onUpdatingValuesEnd,
      animateOnChange,
      isAnimating,
    } = this.props;
    const styles = this.getStyles();

    const isMainnet = isMainnetByChainId(chainId);

    let amount;
    let networkFee;
    let totalAmount;
    let primaryAmount;
    let primaryNetworkFee;
    let primaryTotalAmount;
    const showNativeCurrency = primaryCurrency === 'ETH' || !isMainnet;
    if (showNativeCurrency) {
      amount = fiat;
      networkFee = totalGasFiat;
      totalAmount = totalFiat;

      primaryAmount = transactionValue;
      primaryNetworkFee = totalGasEth;
      primaryTotalAmount = totalValue;
    } else {
      amount = transactionValue;
      networkFee = totalGasEth;
      totalAmount = totalValue;

      primaryAmount = fiat;
      primaryNetworkFee = totalGasFiat;
      primaryTotalAmount = totalFiat;
    }

    const valueToWatchAnimation = totalGasEth !== '0 ETH' ? totalGasEth : null;

    return (
      <View>
        <Summary style={styles.overview}>
          <Summary.Row>
            <Text primary bold>
              {strings('transaction.amount')}
            </Text>
            <FadeAnimationView
              style={styles.valuesContainer}
              valueToWatch={valueToWatchAnimation}
              animateOnChange={animateOnChange}
            >
              {isMainnet && (
                <Text upper right grey style={styles.amountContainer}>
                  {amount}
                </Text>
              )}
              <Text
                upper
                primary
                bold
                right
                style={styles.primaryContainer(!isMainnet)}
              >
                {primaryAmount}
              </Text>
            </FadeAnimationView>
          </Summary.Row>
          <Summary.Row>
            <View>
              <View style={styles.gasFeeTitleContainer}>
                <Text primary bold>
                  {strings('transaction.gas_fee')}
                </Text>
                <TouchableOpacity
                  style={styles.gasInfoContainer}
                  onPress={this.toggleGasTooltip}
                  hitSlop={styles.hitSlop}
                >
                  <MaterialCommunityIcons
                    name="information"
                    size={13}
                    style={styles.gasInfoIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {this.renderIfGasEstimationReady(
              <FadeAnimationView
                style={styles.valuesContainer}
                valueToWatch={valueToWatchAnimation}
                animateOnChange={animateOnChange}
                onAnimationStart={onUpdatingValuesStart}
                onAnimationEnd={onUpdatingValuesEnd}
              >
                {isMainnet && (
                  <View style={styles.amountContainer}>
                    <TouchableOpacity
                      onPress={edit}
                      disabled={showNativeCurrency || isAnimating}
                    >
                      <Text
                        link={!showNativeCurrency}
                        underline={!showNativeCurrency}
                        upper
                        right
                      >
                        {networkFee}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.primaryContainer(!isMainnet)}>
                  <TouchableOpacity
                    onPress={edit}
                    disabled={!showNativeCurrency || isAnimating}
                  >
                    <Text
                      primary
                      bold
                      upper
                      link={showNativeCurrency}
                      underline={showNativeCurrency}
                      right
                      style={[warningGasPriceHigh && styles.over]}
                    >
                      {primaryNetworkFee}
                    </Text>
                  </TouchableOpacity>
                </View>
              </FadeAnimationView>,
            )}
          </Summary.Row>
          <Summary.Separator />
          <Summary.Row>
            <Text primary bold style={[over && styles.over]}>
              {strings('transaction.total')}
            </Text>

            {!!totalFiat &&
              this.renderIfGasEstimationReady(
                <FadeAnimationView
                  style={styles.valuesContainer}
                  valueToWatch={valueToWatchAnimation}
                  animateOnChange={animateOnChange}
                >
                  {isMainnet && (
                    <Text
                      grey={!over}
                      upper
                      right
                      red={Boolean(over)}
                      style={styles.amountContainer}
                    >
                      {totalAmount}
                    </Text>
                  )}

                  <Text
                    bold
                    primary={!over}
                    red={Boolean(over)}
                    upper
                    right
                    style={styles.primaryContainer(!isMainnet)}
                  >
                    {primaryTotalAmount}
                  </Text>
                </FadeAnimationView>,
              )}
          </Summary.Row>
        </Summary>
        {this.renderGasTooltip()}
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

TransactionReviewFeeCard.contextType = ThemeContext;

export default connect(mapStateToProps)(TransactionReviewFeeCard);
