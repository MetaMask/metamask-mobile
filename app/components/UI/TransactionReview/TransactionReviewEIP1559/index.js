import React, { useState, useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet, Linking } from 'react-native';
import Summary from '../../../Base/Summary';
import Text from '../../../Base/Text';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { isMainnetByChainId, isTestNet } from '../../../../util/networks';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import InfoModal from '../../Swaps/components/InfoModal';
import FadeAnimationView from '../../FadeAnimationView';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import TimeEstimateInfoModal from '../../TimeEstimateInfoModal';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import AppConstants from '../../../../core/AppConstants';
import Device from '../../../../util/device';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    overview: (noMargin) => ({
      marginHorizontal: noMargin ? 0 : 24,
      paddingTop: 10,
      paddingBottom: 10,
    }),
    valuesContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    gasInfoContainer: {
      paddingLeft: 2,
    },
    gasInfoIcon: (hasOrigin) => ({
      color: hasOrigin ? colors.secondary.default : colors.icon.muted,
    }),
    amountContainer: {
      flex: 1,
      paddingRight: 10,
    },
    gasRowContainer: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
      marginBottom: 2,
    },
    gasBottomRowContainer: {
      marginTop: 4,
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
    redInfo: {
      color: colors.error.default,
    },
    timeEstimateContainer: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    flex: {
      flex: 1,
    },
  });

// eslint-disable-next-line react/prop-types
const Skeleton = ({ width, noStyle }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[!noStyle && styles.valuesContainer]}>
      <SkeletonPlaceholder>
        <SkeletonPlaceholder.Item width={width} height={10} borderRadius={4} />
      </SkeletonPlaceholder>
    </View>
  );
};

const TransactionReviewEIP1559 = ({
  totalNative,
  totalConversion,
  totalMaxNative,
  gasFeeNative,
  gasFeeConversion,
  gasFeeMaxNative,
  gasFeeMaxConversion,
  timeEstimate,
  timeEstimateColor,
  timeEstimateId,
  primaryCurrency,
  chainId,
  onEdit,
  hideTotal,
  noMargin,
  origin,
  originWarning,
  onUpdatingValuesStart,
  onUpdatingValuesEnd,
  animateOnChange,
  isAnimating,
  gasEstimationReady,
  legacy,
}) => {
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
  const [
    isVisibleTimeEstimateInfoModal,
    ,
    showTimeEstimateInfoModal,
    hideTimeEstimateInfoModal,
  ] = useModalHandler(false);
  const [isVisibleLegacyLearnMore, , showLegacyLearnMore, hideLegacyLearnMore] =
    useModalHandler(false);
  const toggleLearnMoreModal = useCallback(() => {
    setShowLearnMoreModal((showLearnMoreModal) => !showLearnMoreModal);
  }, []);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const openLinkAboutGas = useCallback(
    () =>
      Linking.openURL(
        'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172',
      ),
    [],
  );

  const edit = useCallback(() => {
    if (!isAnimating) onEdit();
  }, [isAnimating, onEdit]);

  const isMainnet = isMainnetByChainId(chainId);
  const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;
  let gasFeePrimary,
    gasFeeSecondary,
    gasFeeMaxPrimary,
    totalPrimary,
    totalSecondary,
    totalMaxPrimary;
  if (nativeCurrencySelected) {
    gasFeePrimary = gasFeeNative;
    gasFeeSecondary = gasFeeConversion;
    gasFeeMaxPrimary = gasFeeMaxNative;
    totalPrimary = totalNative;
    totalSecondary = totalConversion;
    totalMaxPrimary = totalMaxNative;
  } else {
    gasFeePrimary = gasFeeConversion;
    gasFeeSecondary = gasFeeNative;
    gasFeeMaxPrimary = gasFeeMaxConversion;
    totalPrimary = totalConversion;
    totalSecondary = totalNative;
    totalMaxPrimary = gasFeeMaxConversion;
  }

  const valueToWatchAnimation = `${gasFeeNative}${gasFeeMaxNative}`;
  const isTestNetwork = isTestNet(chainId);

  return (
    <Summary style={styles.overview(noMargin)}>
      <Summary.Row>
        <View style={styles.gasRowContainer}>
          <View style={styles.gasRowContainer}>
            <Text
              primary={!originWarning}
              bold
              orange={Boolean(originWarning)}
              noMargin
            >
              {!origin
                ? strings('transaction_review_eip1559.estimated_gas_fee')
                : strings('transaction_review_eip1559.suggested_gas_fee', {
                    origin,
                  })}
              <TouchableOpacity
                style={styles.gasInfoContainer}
                onPress={() =>
                  originWarning ? showLegacyLearnMore() : toggleLearnMoreModal()
                }
                hitSlop={styles.hitSlop}
              >
                <MaterialCommunityIcons
                  name="information"
                  size={13}
                  style={styles.gasInfoIcon(originWarning)}
                />
              </TouchableOpacity>
            </Text>
          </View>

          {gasEstimationReady ? (
            <FadeAnimationView
              style={styles.valuesContainer}
              valueToWatch={valueToWatchAnimation}
              animateOnChange={animateOnChange}
              onAnimationStart={onUpdatingValuesStart}
              onAnimationEnd={onUpdatingValuesEnd}
            >
              {isMainnet && (
                <TouchableOpacity
                  onPress={edit}
                  disabled={nativeCurrencySelected}
                >
                  <Text
                    upper
                    right
                    grey={nativeCurrencySelected}
                    link={!nativeCurrencySelected}
                    underline={!nativeCurrencySelected}
                    style={styles.amountContainer}
                    noMargin
                    adjustsFontSizeToFit
                    numberOfLines={2}
                  >
                    {gasFeeSecondary}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={edit}
                disabled={!nativeCurrencySelected}
                style={[Device.isSmallDevice() && styles.flex]}
              >
                <Text
                  primary
                  bold
                  upper={!isTestNetwork}
                  grey={!nativeCurrencySelected}
                  link={nativeCurrencySelected}
                  underline={nativeCurrencySelected}
                  right
                  noMargin
                  adjustsFontSizeToFit
                  numberOfLines={2}
                >
                  {gasFeePrimary}
                </Text>
              </TouchableOpacity>
            </FadeAnimationView>
          ) : (
            <Skeleton width={80} />
          )}
        </View>
      </Summary.Row>
      {!legacy && (
        <Summary.Row>
          <View style={styles.gasRowContainer}>
            {gasEstimationReady ? (
              <FadeAnimationView
                valueToWatch={valueToWatchAnimation}
                animateOnChange={animateOnChange}
              >
                <View style={styles.timeEstimateContainer}>
                  <Text
                    small
                    green={timeEstimateColor === 'green'}
                    red={timeEstimateColor === 'red'}
                  >
                    {timeEstimate}
                  </Text>
                  {(timeEstimateId === AppConstants.GAS_TIMES.MAYBE ||
                    timeEstimateId === AppConstants.GAS_TIMES.UNKNOWN) && (
                    <TouchableOpacity
                      style={styles.gasInfoContainer}
                      onPress={showTimeEstimateInfoModal}
                      hitSlop={styles.hitSlop}
                    >
                      <MaterialCommunityIcons
                        name="information"
                        size={13}
                        style={styles.redInfo}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </FadeAnimationView>
            ) : (
              <Skeleton width={120} noStyle />
            )}
            {gasEstimationReady ? (
              <FadeAnimationView
                style={styles.valuesContainer}
                valueToWatch={valueToWatchAnimation}
                animateOnChange={animateOnChange}
              >
                <Text grey right small>
                  <Text bold small noMargin>
                    {strings('transaction_review_eip1559.max_fee')}:{' '}
                  </Text>
                  <Text small noMargin>
                    {gasFeeMaxPrimary}
                  </Text>
                </Text>
              </FadeAnimationView>
            ) : (
              <Skeleton width={120} />
            )}
          </View>
        </Summary.Row>
      )}
      {!hideTotal && (
        <View>
          <Summary.Separator />
          <View style={styles.gasBottomRowContainer}>
            <Summary.Row>
              <Text primary bold noMargin>
                {strings('transaction_review_eip1559.total')}
              </Text>
              {gasEstimationReady ? (
                <FadeAnimationView
                  style={styles.valuesContainer}
                  valueToWatch={valueToWatchAnimation}
                  animateOnChange={animateOnChange}
                >
                  {isMainnet && totalSecondary !== 'undefined' && (
                    <Text
                      grey
                      upper
                      right
                      noMargin
                      style={styles.amountContainer}
                      adjustsFontSizeToFit
                      numberOfLines={2}
                    >
                      {totalSecondary}
                    </Text>
                  )}

                  <Text
                    bold
                    primary
                    upper={!isTestNetwork}
                    right
                    noMargin
                    style={[Device.isSmallDevice() && styles.flex]}
                    adjustsFontSizeToFit
                    numberOfLines={2}
                  >
                    {totalPrimary}
                  </Text>
                </FadeAnimationView>
              ) : (
                <Skeleton width={80} />
              )}
            </Summary.Row>
          </View>
          {!legacy && (
            <Summary.Row>
              {gasEstimationReady ? (
                <FadeAnimationView
                  style={styles.valuesContainer}
                  valueToWatch={valueToWatchAnimation}
                  animateOnChange={animateOnChange}
                >
                  <Text grey right small>
                    <Text bold small noMargin>
                      {strings('transaction_review_eip1559.max_amount')}:
                    </Text>{' '}
                    <Text small noMargin>
                      {totalMaxPrimary}
                    </Text>
                  </Text>
                </FadeAnimationView>
              ) : (
                <Skeleton width={120} />
              )}
            </Summary.Row>
          )}
        </View>
      )}
      <InfoModal
        isVisible={isVisibleLegacyLearnMore}
        toggleModal={hideLegacyLearnMore}
        body={
          <Text infoModal>
            {strings(
              'transaction_review_eip1559.legacy_gas_suggestion_tooltip',
            )}
          </Text>
        }
      />
      <InfoModal
        isVisible={showLearnMoreModal}
        title={strings('transaction_review_eip1559.estimated_gas_fee_tooltip')}
        toggleModal={toggleLearnMoreModal}
        body={
          <View>
            <Text infoModal>
              {strings(
                'transaction_review_eip1559.estimated_gas_fee_tooltip_text_1',
              )}
              {isMainnet &&
                strings(
                  'transaction_review_eip1559.estimated_gas_fee_tooltip_text_2',
                )}
              {strings(
                'transaction_review_eip1559.estimated_gas_fee_tooltip_text_3',
              )}{' '}
              <Text bold noMargin>
                {strings(
                  'transaction_review_eip1559.estimated_gas_fee_tooltip_text_4',
                )}
              </Text>
            </Text>
            <Text infoModal>
              {strings(
                'transaction_review_eip1559.estimated_gas_fee_tooltip_text_5',
              )}
            </Text>
            <TouchableOpacity onPress={openLinkAboutGas}>
              <Text link>
                {strings('transaction_review_eip1559.learn_more')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
      <TimeEstimateInfoModal
        isVisible={isVisibleTimeEstimateInfoModal}
        timeEstimateId={timeEstimateId}
        onHideModal={hideTimeEstimateInfoModal}
      />
    </Summary>
  );
};

TransactionReviewEIP1559.propTypes = {
  /**
   * Total value in native currency
   */
  totalNative: PropTypes.string,
  /**
   * Total value converted to chosen currency
   */
  totalConversion: PropTypes.string,
  /**
   * Total max value (amount + max fee) native
   */
  totalMaxNative: PropTypes.string,
  /**
   * Gas fee in native currency
   */
  gasFeeNative: PropTypes.string,
  /**
   * Gas fee converted to chosen currency
   */
  gasFeeConversion: PropTypes.string,
  /**
   * Maximum gas fee in native currency
   */
  gasFeeMaxNative: PropTypes.string,
  /**
   * Maximum gas fee onverted to chosen currency
   */
  gasFeeMaxConversion: PropTypes.string,
  /**
   * Selected primary currency
   */
  primaryCurrency: PropTypes.string,
  /**
   * A string representing the network chainId
   */
  chainId: PropTypes.string,
  /**
   * Function called when user clicks to edit the gas fee
   */
  onEdit: PropTypes.func,
  /**
   * String that represents the time estimates
   */
  timeEstimate: PropTypes.string,
  /**
   * String that represents the color of the time estimate
   */
  timeEstimateColor: PropTypes.string,
  /**
   * Time estimate name (unknown, low, medium, high, less_than, range)
   */
  timeEstimateId: PropTypes.string,
  /**
   * Boolean to determine if the total section should be hidden
   */
  hideTotal: PropTypes.bool,
  /**
   * Boolean to determine the container should have no margin
   */
  noMargin: PropTypes.bool,
  /**
   * Origin (hostname) of the dapp that suggested the gas fee
   */
  origin: PropTypes.string,
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
  /**
   * If loading should stop
   */
  gasEstimationReady: PropTypes.bool,
  /**
   * If should show legacy gas
   */
  legacy: PropTypes.bool,
  /**
   * If it's a eip1559 network and dapp suggest legact gas then it should show a warning
   */
  originWarning: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

export default connect(mapStateToProps)(TransactionReviewEIP1559);
