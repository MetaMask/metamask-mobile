/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { EditGasViewSelectorsIDs } from '../../../../../../../../e2e/selectors/SendFlow/EditGasView.selectors';
import { strings } from '../../../../../../../../locales/i18n';
import AppConstants from '../../../../../../../core/AppConstants';
import { useGasTransaction } from '../../../../../../../core/GasPolling/GasPolling';
import Device from '../../../../../../../util/device';
import { isMainnetByChainId } from '../../../../../../../util/networks';
import {
  mockTheme,
  useAppThemeFromContext,
} from '../../../../../../../util/theme';
import useModalHandler from '../../../../../../Base/hooks/useModalHandler';
import Summary from '../../../../../../Base/Summary';
import Text from '../../../../../../Base/Text';
import FadeAnimationView from '../../../../../../UI/FadeAnimationView';
import InfoModal from '../../../../../../Base/InfoModal';
import TimeEstimateInfoModal from '../../../../../../UI/TimeEstimateInfoModal';
import SkeletonComponent from './skeletonComponent';
import createStyles from './styles';

const TransactionReviewEIP1559Update = ({
  primaryCurrency,
  chainId,
  onEdit,
  hideTotal,
  noMargin,
  originWarning,
  onUpdatingValuesStart,
  onUpdatingValuesEnd,
  animateOnChange,
  isAnimating,
  gasEstimationReady,
  legacy,
  gasSelected,
  gasObject,
  gasObjectLegacy,
  onlyGas,
  updateTransactionState,
  multiLayerL1FeeTotal,
}) => {
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
  const [
    isVisibleTimeEstimateInfoModal,
    ,
    // extra comma above is to ignore second value in array returned from hook useModalHandler
    showTimeEstimateInfoModal,
    hideTimeEstimateInfoModal,
  ] = useModalHandler(false);
  const [isVisibleLegacyLearnMore, , showLegacyLearnMore, hideLegacyLearnMore] =
    useModalHandler(false);
  const toggleLearnMoreModal = useCallback(() => {
    setShowLearnMoreModal(!showLearnMoreModal);
  }, [showLearnMoreModal]);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const gasTransaction = useGasTransaction({
    onlyGas: !!onlyGas,
    gasSelected,
    legacy: !!legacy,
    gasObject,
    gasObjectLegacy,
    multiLayerL1FeeTotal,
  });

  const {
    gasFeeMaxNative,
    renderableGasFeeMinNative,
    renderableGasFeeMinConversion,
    renderableGasFeeMaxNative,
    renderableTotalMinNative,
    renderableTotalMinConversion,
    renderableTotalMaxNative,
    renderableGasFeeMaxConversion,
    timeEstimateColor,
    timeEstimate,
    timeEstimateId,
    transactionFee,
    transactionFeeFiat,
    transactionTotalAmount,
    transactionTotalAmountFiat,
    suggestedGasLimit,
  } = gasTransaction;

  useEffect(() => {
    if (gasEstimationReady) {
      updateTransactionState(gasTransaction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gasEstimationReady,
    updateTransactionState,
    suggestedGasLimit,
    gasFeeMaxNative,
  ]);

  const openLinkAboutGas = useCallback(
    () => Linking.openURL(AppConstants.URLS.WHY_TRANSACTION_TAKE_TIME),
    [],
  );

  const edit = useCallback(() => {
    if (!isAnimating) onEdit();
  }, [isAnimating, onEdit]);

  const isMainnet = isMainnetByChainId(chainId);
  const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;

  const switchNativeCurrencyDisplayOptions = (nativeValue, fiatValue) => {
    if (nativeCurrencySelected) return nativeValue;
    return fiatValue;
  };

  const valueToWatchAnimation = `${renderableGasFeeMinNative}${renderableGasFeeMaxNative}`;

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
              {strings('transaction_review_eip1559.network_fee')}
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
                  testID={EditGasViewSelectorsIDs.ESTIMATED_FEE_TEST_ID}
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
                    {legacy
                      ? switchNativeCurrencyDisplayOptions(
                          transactionFeeFiat,
                          transactionFee,
                        )
                      : switchNativeCurrencyDisplayOptions(
                          renderableGasFeeMinConversion,
                          renderableGasFeeMinNative,
                        )}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={edit}
                disabled={!nativeCurrencySelected}
                style={[Device.isSmallDevice() && styles.flex]}
                testID={EditGasViewSelectorsIDs.ESTIMATED_FEE_TEST_ID}
              >
                <Text
                  primary
                  bold
                  upper
                  grey={!nativeCurrencySelected}
                  link={nativeCurrencySelected}
                  underline={nativeCurrencySelected}
                  right
                  noMargin
                  adjustsFontSizeToFit
                  numberOfLines={2}
                >
                  {legacy
                    ? switchNativeCurrencyDisplayOptions(
                        transactionFee,
                        transactionFeeFiat,
                      )
                    : switchNativeCurrencyDisplayOptions(
                        renderableGasFeeMinNative,
                        renderableGasFeeMinConversion,
                      )}
                </Text>
              </TouchableOpacity>
            </FadeAnimationView>
          ) : (
            <SkeletonComponent width={80} />
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
                    orange={timeEstimateColor === 'orange'}
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
              <SkeletonComponent width={120} noStyle />
            )}
            {gasEstimationReady ? (
              <FadeAnimationView
                style={styles.valuesContainer}
                valueToWatch={valueToWatchAnimation}
                animateOnChange={animateOnChange}
              >
                <Text right>
                  <Text
                    bold
                    small
                    noMargin
                    grey={timeEstimateColor !== 'orange'}
                    orange={timeEstimateColor === 'orange'}
                  >
                    {timeEstimateId === AppConstants.GAS_TIMES.VERY_LIKELY && (
                      <TouchableOpacity
                        style={styles.gasInfoContainer}
                        onPress={showTimeEstimateInfoModal}
                        hitSlop={styles.hitSlop}
                      >
                        <MaterialCommunityIcons
                          name="alert"
                          size={13}
                          style={styles.redInfo}
                        />
                      </TouchableOpacity>
                    )}
                  </Text>{' '}
                  <Text
                    bold
                    small
                    noMargin
                    grey={timeEstimateColor !== 'orange'}
                    orange={timeEstimateColor === 'orange'}
                  >
                    {strings('transaction_review_eip1559.max_fee')}:{' '}
                  </Text>
                  <Text
                    small
                    noMargin
                    grey={timeEstimateColor !== 'orange'}
                    orange={timeEstimateColor === 'orange'}
                  >
                    {switchNativeCurrencyDisplayOptions(
                      renderableGasFeeMaxNative,
                      renderableGasFeeMaxConversion,
                    )}
                  </Text>
                </Text>
              </FadeAnimationView>
            ) : (
              <SkeletonComponent width={120} />
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
                  {isMainnet &&
                    switchNativeCurrencyDisplayOptions(
                      renderableTotalMinConversion,
                      renderableTotalMinNative,
                    ) !== 'undefined' && (
                      <Text
                        grey
                        upper
                        right
                        noMargin
                        style={styles.amountContainer}
                        adjustsFontSizeToFit
                        numberOfLines={2}
                      >
                        {legacy
                          ? switchNativeCurrencyDisplayOptions(
                              transactionTotalAmountFiat,
                              transactionTotalAmount,
                            )
                          : switchNativeCurrencyDisplayOptions(
                              renderableTotalMinConversion,
                              renderableTotalMinNative,
                            )}
                      </Text>
                    )}

                  <Text
                    bold
                    primary
                    upper
                    right
                    noMargin
                    style={[Device.isSmallDevice() && styles.flex]}
                    adjustsFontSizeToFit
                    numberOfLines={2}
                  >
                    {legacy
                      ? switchNativeCurrencyDisplayOptions(
                          transactionTotalAmount,
                          transactionTotalAmountFiat,
                        )
                      : switchNativeCurrencyDisplayOptions(
                          renderableTotalMinNative,
                          renderableTotalMinConversion,
                        )}
                  </Text>
                </FadeAnimationView>
              ) : (
                <SkeletonComponent width={80} />
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
                      {switchNativeCurrencyDisplayOptions(
                        renderableTotalMaxNative,
                        renderableGasFeeMaxConversion,
                      )}
                    </Text>
                  </Text>
                </FadeAnimationView>
              ) : (
                <SkeletonComponent width={120} />
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

export default TransactionReviewEIP1559Update;
