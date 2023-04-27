import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  SafeAreaView,
} from 'react-native';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';
import BigNumber from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';
import {
  fromTokenMinimalUnitString,
  renderFromTokenMinimalUnit,
  renderFromWei,
  toWei,
  weiToFiat,
  calculateEthFeeForMultiLayer,
} from '../../../../util/number';
import { getQuotesSourceMessage } from '../utils';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import Ratio from './Ratio';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors, shadows) =>
  StyleSheet.create({
    modalView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 50,
      borderRadius: 10,
      ...shadows.size.sm,
      elevation: 11,
    },
    modal: {
      margin: 0,
      width: '100%',
      padding: 25,
    },
    title: {
      width: '100%',
      paddingVertical: 15,
      paddingHorizontal: 20,
      paddingBottom: 5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: colors.text.default,
    },
    titleButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeIcon: {
      color: colors.text.default,
    },
    backIcon: {
      color: colors.text.default,
      marginRight: 16,
    },
    detailsIcon: {
      color: colors.text.default,
      paddingHorizontal: 10,
    },
    body: {
      width: '100%',
      paddingVertical: 5,
    },
    row: {
      paddingHorizontal: 20,
      flexDirection: 'row',
      paddingVertical: 10,
    },
    quoteRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingVertical: 15,
      alignItems: 'center',
    },
    detailsRow: {
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingVertical: 15,
    },
    selectedQuoteRow: {
      backgroundColor: colors.primary.muted,
    },
    columnAmount: {
      flex: 3,
      marginRight: 5,
    },
    columnFee: {
      flex: 3,
      marginRight: 5,
    },
    columnValue: {
      flex: 3,
      marginRight: 5,
    },
    red: {
      color: colors.error.default,
    },
    bestBadge: {
      flexDirection: 'row',
    },
    bestBadgeWrapper: {
      paddingVertical: 0,
      paddingHorizontal: 8,
      backgroundColor: colors.primary.default,
      borderRadius: 4,
    },
    bestBadgeText: {
      color: colors.primary.inverse,
    },
    transparent: {
      opacity: 0,
    },
  });

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function QuotesModal({
  isVisible,
  toggleModal,
  quotes,
  selectedQuote,
  sourceToken,
  destinationToken,
  conversionRate,
  currentCurrency,
  quoteValues,
  showOverallValue,
  ticker,
  multiLayerL1ApprovalFeeTotal,
}) {
  const bestOverallValue =
    quoteValues?.[quotes[0].aggregator]?.overallValueOfQuote ?? 0;
  const [displayDetails, setDisplayDetails] = useState(false);
  const [selectedDetailsQuoteIndex, setSelectedDetailsQuoteIndex] =
    useState(null);
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  // When index/quotes change we get a new selected quote in case it exists
  // (quotes.length can be shorter than selected index)
  const selectedDetailsQuote = useMemo(() => {
    if (
      selectedDetailsQuoteIndex !== null &&
      quotes?.[selectedDetailsQuoteIndex]
    ) {
      return quotes[selectedDetailsQuoteIndex];
    }
    return null;
  }, [quotes, selectedDetailsQuoteIndex]);

  // When index/quotes/quoteValues change we get a new selected quoteValaue in case it exists
  const selectedDetailsQuoteValues = useMemo(() => {
    if (
      selectedDetailsQuoteIndex !== null &&
      selectedDetailsQuote &&
      quoteValues?.[selectedDetailsQuote.aggregator]
    ) {
      return quoteValues[selectedDetailsQuote.aggregator];
    }
    return null;
  }, [quoteValues, selectedDetailsQuote, selectedDetailsQuoteIndex]);

  // Toggle displaying details
  const toggleDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDisplayDetails((f) => !f);
  }, []);

  // Toggle to the details in case the quote exist
  const handleQuoteDetailsPress = useCallback(
    (index) => {
      if (quotes?.[index]) {
        setSelectedDetailsQuoteIndex(index);
        toggleDetails();
      }
    },
    [toggleDetails, quotes],
  );

  // Go back from the detail view to the list before dismissing the modal
  const handleBackButtonPress = useCallback(() => {
    if (displayDetails) {
      return toggleDetails();
    }
    toggleModal();
  }, [toggleDetails, displayDetails, toggleModal]);

  // Go back to the list view when modal is visible
  useEffect(() => {
    if (isVisible) {
      setDisplayDetails(false);
    }
  }, [isVisible]);

  // When quotes change go back to the first quote as selected
  useEffect(() => {
    setSelectedDetailsQuoteIndex(quotes?.[0] || null);
  }, [quotes]);

  // If details are going to be displayed but the quotes does not exist,
  // go back to the list
  useEffect(() => {
    if (displayDetails && !selectedDetailsQuote) {
      setDisplayDetails(false);
    }
  }, [displayDetails, selectedDetailsQuote]);

  let selectedDetailsQuoteValuesEthFee = selectedDetailsQuoteValues?.ethFee;
  if (multiLayerL1ApprovalFeeTotal) {
    selectedDetailsQuoteValuesEthFee = calculateEthFeeForMultiLayer({
      multiLayerL1FeeTotal: multiLayerL1ApprovalFeeTotal,
      ethFee: selectedDetailsQuoteValuesEthFee,
    });
  }

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={toggleModal}
      onBackButtonPress={handleBackButtonPress}
      onSwipeComplete={toggleModal}
      swipeDirection="down"
      propagateSwipe
      style={styles.modal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <SafeAreaView style={styles.modalView}>
        <View style={styles.title}>
          {displayDetails ? (
            <TouchableOpacity
              onPress={toggleDetails}
              style={styles.titleButton}
              hitSlop={{ top: 10, left: 20, right: 10, bottom: 10 }}
            >
              <IonicIcon
                name="ios-arrow-back"
                style={styles.backIcon}
                size={20}
              />
              <Title>{strings('swaps.quote_details')}</Title>
            </TouchableOpacity>
          ) : (
            <Title>{strings('swaps.quotes_overview')}</Title>
          )}

          <TouchableOpacity
            onPress={toggleModal}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
          >
            <IonicIcon name="ios-close" style={styles.closeIcon} size={30} />
          </TouchableOpacity>
        </View>
        {displayDetails ? (
          <ScrollView key="details" style={styles.body}>
            <View onStartShouldSetResponder={() => true}>
              {!!selectedDetailsQuote && !!selectedDetailsQuoteValues && (
                <>
                  <View style={styles.detailsRow}>
                    <Text small>{strings('swaps.rate')}</Text>
                    <Ratio
                      sourceAmount={selectedDetailsQuote.sourceAmount}
                      sourceToken={sourceToken}
                      destinationAmount={selectedDetailsQuote.destinationAmount}
                      destinationToken={destinationToken}
                      boldSymbol
                    />
                  </View>
                  <View style={styles.detailsRow}>
                    <Text small>
                      {strings('swaps.quote_details_max_slippage')}
                    </Text>
                    <Text primary>{selectedDetailsQuote.slippage}%</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text small>{strings('swaps.guaranteed_amount')}</Text>
                    <Text primary>
                      {fromTokenMinimalUnitString(
                        selectedDetailsQuote.destinationAmount,
                        destinationToken.decimals,
                      )}{' '}
                      <Text reset bold>
                        {destinationToken.symbol}
                      </Text>
                      {selectedDetailsQuote?.priceSlippage?.calculationError
                        ?.length === 0 &&
                        selectedDetailsQuote?.priceSlippage
                          ?.destinationAmountInETH && (
                          <Text>
                            {' '}
                            (~
                            {weiToFiat(
                              toWei(
                                selectedDetailsQuote.priceSlippage
                                  .destinationAmountInETH,
                              ),
                              conversionRate,
                              currentCurrency,
                            )}
                            )
                          </Text>
                        )}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text small>{strings('swaps.estimated_network_fees')}</Text>
                    <Text primary>
                      {renderFromWei(toWei(selectedDetailsQuoteValuesEthFee))}{' '}
                      <Text reset bold>
                        {ticker}
                      </Text>{' '}
                      <Text>
                        (~
                        {weiToFiat(
                          toWei(selectedDetailsQuoteValuesEthFee),
                          conversionRate,
                          currentCurrency,
                        )}
                        )
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text small>{strings('swaps.source')}</Text>
                    <Text primary>
                      {getQuotesSourceMessage(selectedDetailsQuote.aggType).map(
                        (message, index) =>
                          index === 1 ? (
                            <Text reset bold key={index}>
                              {message}{' '}
                            </Text>
                          ) : (
                            <Text reset key={index}>
                              {message}{' '}
                            </Text>
                          ),
                      )}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView key="list" style={styles.body}>
            <View onStartShouldSetResponder={() => true}>
              <View style={styles.body}>
                <View style={styles.row}>
                  <View style={styles.columnAmount}>
                    <Text small bold>
                      {destinationToken.symbol}
                    </Text>
                    <Text small primary bold>
                      {strings('swaps.receiving')}
                    </Text>
                  </View>
                  <View style={styles.columnFee}>
                    <Text small primary bold>
                      {strings('swaps.estimated_gas_fee')}
                    </Text>
                  </View>
                  <View style={styles.columnValue}>
                    <Text small primary bold>
                      {strings('swaps.overall_value')}
                    </Text>
                  </View>
                  <IonicIcon
                    name="ios-arrow-forward"
                    style={[styles.detailsIcon, styles.transparent]}
                    size={20}
                  />
                </View>
                <View>
                  {quotes.length > 0 &&
                    quotes.map((quote, index) => {
                      const { aggregator } = quote;
                      const isSelected = aggregator === selectedQuote;
                      const quoteValue = quoteValues[aggregator];
                      let quoteEthFee = quoteValue?.ethFee;
                      if (multiLayerL1ApprovalFeeTotal) {
                        quoteEthFee = calculateEthFeeForMultiLayer({
                          multiLayerL1FeeTotal: multiLayerL1ApprovalFeeTotal,
                          ethFee: quoteEthFee,
                        });
                      }
                      return (
                        <TouchableOpacity
                          key={aggregator}
                          onPress={() => handleQuoteDetailsPress(index)}
                          style={[
                            styles.row,
                            styles.quoteRow,
                            isSelected && styles.selectedQuoteRow,
                          ]}
                        >
                          <View style={styles.columnAmount}>
                            <Text primary bold={isSelected}>
                              ~
                              {renderFromTokenMinimalUnit(
                                quote.destinationAmount,
                                destinationToken.decimals,
                              )}
                            </Text>
                          </View>
                          <View style={styles.columnFee}>
                            <Text primary bold={isSelected}>
                              {weiToFiat(
                                toWei(quoteEthFee),
                                conversionRate,
                                currentCurrency,
                              )}
                            </Text>
                          </View>
                          <View style={styles.columnValue}>
                            {index === 0 ? (
                              showOverallValue ? (
                                <View style={styles.bestBadge}>
                                  <View style={styles.bestBadgeWrapper}>
                                    <Text
                                      bold
                                      small
                                      style={styles.bestBadgeText}
                                    >
                                      {strings('swaps.best')}
                                    </Text>
                                  </View>
                                </View>
                              ) : (
                                <Text> - </Text>
                              )
                            ) : showOverallValue ? (
                              <Text primary style={styles.red}>
                                -
                                {weiToFiat(
                                  toWei(
                                    (
                                      bestOverallValue -
                                      (quoteValue?.overallValueOfQuote ?? 0)
                                    ).toFixed(18),
                                  ),
                                  conversionRate,
                                  currentCurrency,
                                )}
                              </Text>
                            ) : (
                              <Text style={styles.red}>
                                -
                                {renderFromTokenMinimalUnit(
                                  new BigNumber(quotes[0].destinationAmount)
                                    .minus(quote.destinationAmount)
                                    .toString(10),
                                  destinationToken.decimals,
                                )}
                              </Text>
                            )}
                          </View>
                          <IonicIcon
                            name="ios-arrow-forward"
                            style={styles.detailsIcon}
                            size={20}
                          />

                          <Text />
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

QuotesModal.propTypes = {
  isVisible: PropTypes.bool,
  toggleModal: PropTypes.func,
  quotes: PropTypes.array,
  selectedQuote: PropTypes.string,
  destinationToken: PropTypes.shape({
    symbol: PropTypes.string,
    decimals: PropTypes.number,
  }),
  sourceToken: PropTypes.shape({
    symbol: PropTypes.string,
    decimals: PropTypes.number,
  }),
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * Native asset ticker
   */
  ticker: PropTypes.string,
  quoteValues: PropTypes.object,
  showOverallValue: PropTypes.bool,
  multiLayerL1ApprovalFeeTotal: PropTypes.string,
};

const mapStateToProps = (state) => ({
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  quoteValues: state.engine.backgroundState.SwapsController.quoteValues,
});

export default connect(mapStateToProps)(QuotesModal);
