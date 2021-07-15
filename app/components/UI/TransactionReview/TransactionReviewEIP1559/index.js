import React, { useState, useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet, Linking } from 'react-native';
import Summary from '../../../Base/Summary';
import Text from '../../../Base/Text';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../../styles/common';
import { isMainnetByChainId } from '../../../../util/networks';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import InfoModal from '../../Swaps/components/InfoModal';
import FadeAnimationView from '../../FadeAnimationView';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const styles = StyleSheet.create({
	overview: noMargin => ({
		marginHorizontal: noMargin ? 0 : 24
	}),
	valuesContainer: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	gasInfoContainer: {
		paddingHorizontal: 2
	},
	gasInfoIcon: hasOrigin => ({
		color: hasOrigin ? colors.orange : colors.grey200,
		marginTop: 5
	}),
	amountContainer: {
		flex: 1,
		paddingRight: 10
	},
	gasFeeTitleContainer: {
		flexDirection: 'row',
		flex: 1
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
});

// eslint-disable-next-line react/prop-types
const Skeleton = ({ width, noStyle }) => (
	<View style={[!noStyle && styles.valuesContainer]}>
		<SkeletonPlaceholder>
			<SkeletonPlaceholder.Item width={width} height={10} borderRadius={4} />
		</SkeletonPlaceholder>
	</View>
);

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
	primaryCurrency,
	chainId,
	onEdit,
	hideTotal,
	noMargin,
	origin,
	onUpdatingValuesStart,
	onUpdatingValuesEnd,
	canAnimate,
	isAnimating
}) => {
	const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);

	const toggleLearnMoreModal = useCallback(() => {
		setShowLearnMoreModal(showLearnMoreModal => !showLearnMoreModal);
	}, []);

	const openLinkAboutGas = useCallback(
		() => Linking.openURL('https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172'),
		[]
	);

	const edit = useCallback(() => {
		if (!isAnimating) onEdit();
	}, [isAnimating, onEdit]);

	const isMainnet = isMainnetByChainId(chainId);
	const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;
	let gasFeePrimary, gasFeeSecondary, gasFeeMaxPrimary, totalPrimary, totalSecondary, totalMaxPrimary;
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

	const valueToWatchAnimation = gasFeeNative;
	return (
		<Summary style={styles.overview(noMargin)}>
			<Summary.Row>
				<View style={styles.gasFeeTitleContainer}>
					<Text primary={!origin} bold orange={Boolean(origin)}>
						{!origin ? 'Estimated gas fee' : `${origin} suggested gas fee`}
						<TouchableOpacity
							style={styles.gasInfoContainer}
							onPress={toggleLearnMoreModal}
							hitSlop={styles.hitSlop}
						>
							<MaterialCommunityIcons name="information" size={13} style={styles.gasInfoIcon(origin)} />
						</TouchableOpacity>
					</Text>
				</View>
				{gasFeePrimary ? (
					<FadeAnimationView
						style={styles.valuesContainer}
						valueToWatch={valueToWatchAnimation}
						canAnimate={canAnimate}
						onAnimationStart={onUpdatingValuesStart}
						onAnimationEnd={onUpdatingValuesEnd}
					>
						{isMainnet && (
							<TouchableOpacity onPress={edit} disabled={nativeCurrencySelected}>
								<Text
									upper
									right
									grey={nativeCurrencySelected}
									link={!nativeCurrencySelected}
									underline={!nativeCurrencySelected}
									style={styles.amountContainer}
								>
									{gasFeeSecondary}
								</Text>
							</TouchableOpacity>
						)}

						<TouchableOpacity onPress={edit} disabled={!nativeCurrencySelected}>
							<Text
								primary
								bold
								upper
								grey={!nativeCurrencySelected}
								link={nativeCurrencySelected}
								underline={nativeCurrencySelected}
								right
							>
								{gasFeePrimary}
							</Text>
						</TouchableOpacity>
					</FadeAnimationView>
				) : (
					<Skeleton width={80} />
				)}
			</Summary.Row>
			<Summary.Row>
				{timeEstimate ? (
					<FadeAnimationView valueToWatch={valueToWatchAnimation} canAnimate={canAnimate}>
						<Text small green={timeEstimateColor === 'green'} red={timeEstimateColor === 'red'}>
							{timeEstimate}
						</Text>
					</FadeAnimationView>
				) : (
					<Skeleton width={120} noStyle />
				)}
				{gasFeeMaxPrimary ? (
					<FadeAnimationView
						style={styles.valuesContainer}
						valueToWatch={valueToWatchAnimation}
						canAnimate={canAnimate}
					>
						<Text grey right small>
							<Text bold small noMargin>
								Max fee:{' '}
							</Text>
							<Text bold small noMargin>
								{gasFeeMaxPrimary}
							</Text>
						</Text>
					</FadeAnimationView>
				) : (
					<Skeleton width={120} />
				)}
			</Summary.Row>
			{!hideTotal && (
				<View>
					<Summary.Separator />
					<Summary.Row>
						<Text primary bold>
							Total
						</Text>
						{totalPrimary ? (
							<FadeAnimationView
								style={styles.valuesContainer}
								valueToWatch={valueToWatchAnimation}
								canAnimate={canAnimate}
							>
								{isMainnet && (
									<Text grey upper right style={styles.amountContainer}>
										{totalSecondary}
									</Text>
								)}

								<Text bold primary upper right>
									{totalPrimary}
								</Text>
							</FadeAnimationView>
						) : (
							<Skeleton width={80} />
						)}
					</Summary.Row>
					<Summary.Row>
						{totalMaxPrimary ? (
							<FadeAnimationView
								style={styles.valuesContainer}
								valueToWatch={valueToWatchAnimation}
								canAnimate={canAnimate}
							>
								<Text grey right small>
									<Text bold small noMargin>
										Max amount:
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
				</View>
			)}
			<InfoModal
				isVisible={showLearnMoreModal}
				title={'Estimated gas fee tooltip'}
				toggleModal={toggleLearnMoreModal}
				body={
					<View>
						<Text infoModal>
							{`Estimated gas fee tooltip: Gas fees are paid to crypto miners who process transactions on the Ethereum network.\n`}
							{`MetaMask does not profit from gas fees.\n\n`}
							{`Gas fees are set by the network and fluctuate based on network traffic and transaction complexity.\n`}
						</Text>
						<TouchableOpacity onPress={openLinkAboutGas}>
							<Text link>Learn more about gas fees</Text>
						</TouchableOpacity>
					</View>
				}
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
	canAnimate: PropTypes.bool,
	/**
	 * Boolean to determine if the animation is happening
	 */
	isAnimating: PropTypes.bool
};

const mapStateToProps = state => ({
	chainId: state.engine.backgroundState.NetworkController.provider.chainId
});

export default connect(mapStateToProps)(TransactionReviewEIP1559);
