import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';

import Title from '../../../Base/Title';
import { colors } from '../../../../styles/common';
import Text from '../../../Base/Text';
import { renderFromTokenMinimalUnit, toWei, weiToFiat } from '../../../../util/number';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	modalView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 50,
		borderRadius: 10,
		shadowColor: colors.black,
		shadowOffset: {
			width: 0,
			height: 5
		},
		shadowOpacity: 0.36,
		shadowRadius: 6.68,
		elevation: 11
	},
	modal: {
		margin: 0,
		width: '100%',
		padding: 25
	},
	title: {
		width: '100%',
		paddingVertical: 15,
		paddingHorizontal: 20,
		paddingBottom: 5,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	closeIcon: {
		color: colors.black
	},
	body: {
		width: '100%',
		paddingVertical: 5
	},
	row: {
		paddingHorizontal: 20,
		flexDirection: 'row',
		paddingVertical: 10
	},
	quoteRow: {
		borderTopWidth: 1,
		borderTopColor: colors.grey100,
		paddingVertical: 15,
		alignItems: 'center'
	},
	selectedQuoteRow: {
		backgroundColor: colors.blue000
	},
	columnAmount: {
		flex: 3,
		marginRight: 5
	},
	columnFee: {
		flex: 3,
		marginRight: 5
	},
	columnValue: {
		flex: 3,
		marginRight: 5
	},
	red: {
		color: colors.red
	},
	bestBadge: {
		flexDirection: 'row'
	},
	bestBadgeWrapper: {
		paddingVertical: 0,
		paddingHorizontal: 8,
		backgroundColor: colors.blue,
		borderRadius: 4
	},
	bestBadgeText: {
		color: colors.white
	}
});

function QuotesModal({
	isVisible,
	toggleModal,
	quotes,
	selectedQuote,
	destinationToken,
	conversionRate,
	currentCurrency,
	quoteValues
}) {
	const bestOverallValue = quoteValues[selectedQuote].overallValueOfQuote;
	const orderedQuoteValues = useMemo(
		() => Object.values(quoteValues).sort((a, b) => Number(b.overallValueOfQuote) - Number(a.overallValueOfQuote)),
		[quoteValues]
	);
	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={toggleModal}
			onBackButtonPress={toggleModal}
			onSwipeComplete={toggleModal}
			swipeDirection="down"
			propagateSwipe
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<View style={styles.title}>
					<Title>{strings('swaps.quotes_analyzed')}</Title>
					<TouchableOpacity onPress={toggleModal}>
						<IonicIcon name="ios-close" style={styles.closeIcon} size={30} />
					</TouchableOpacity>
				</View>
				<ScrollView style={styles.body}>
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
							</View>
							<View>
								{orderedQuoteValues.length > 0 &&
									orderedQuoteValues.map(tradeFee => {
										const quote = quotes.find(quote => quote.aggregator === tradeFee.aggregator);
										const isSelected = tradeFee.aggregator === selectedQuote;
										return (
											<View
												key={tradeFee.aggregator}
												style={[
													styles.row,
													styles.quoteRow,
													isSelected && styles.selectedQuoteRow
												]}
											>
												<View style={styles.columnAmount}>
													<Text primary bold={isSelected}>
														~
														{renderFromTokenMinimalUnit(
															quote.destinationAmount,
															destinationToken.decimals
														)}
													</Text>
												</View>
												<View style={styles.columnFee}>
													<Text primary bold={isSelected}>
														{weiToFiat(
															toWei(tradeFee.ethFee),
															conversionRate,
															currentCurrency
														)}
													</Text>
												</View>
												<View style={styles.columnValue}>
													{quote.aggregator === selectedQuote ? (
														<View style={styles.bestBadge}>
															<View style={styles.bestBadgeWrapper}>
																<Text bold small style={styles.bestBadgeText}>
																	{strings('swaps.best')}
																</Text>
															</View>
														</View>
													) : (
														<Text primary style={styles.red}>
															-
															{weiToFiat(
																toWei(
																	(
																		tradeFee.overallValueOfQuote - bestOverallValue
																	).toFixed(18)
																),
																conversionRate,
																currentCurrency
															)}
														</Text>
													)}
												</View>
												<Text />
											</View>
										);
									})}
							</View>
						</View>
					</View>
				</ScrollView>
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
		decimals: PropTypes.number
	}),
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	quoteValues: PropTypes.object
};

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	quoteValues: state.engine.backgroundState.SwapsController.quoteValues
});

export default connect(mapStateToProps)(QuotesModal);
