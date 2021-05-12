import React, { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { baseStyles, colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import RemoteImage from '../../Base/RemoteImage';
import StyledButton from '../../UI/StyledButton';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import AntIcons from 'react-native-vector-icons/AntDesign';
import Device from '../../../util/Device';
import { toLocaleDate } from '../../../util/date';
import { renderFromWei } from '../../../util/number';
import { renderShortAddress } from '../../../util/address';
import etherscanLink from '@metamask/etherscan-link';
import { addFavoriteCollectible, removeFavoriteCollectible } from '../../../actions/collectibles';
import { favoritesCollectiblesObjectSelector, isCollectibleInFavorites } from '../../../reducers/collectibles';
import Share from 'react-native-share';
import { PanGestureHandler } from 'react-native-gesture-handler';

const DEVICE_HEIGHT = Device.getDeviceHeight();

const styles = StyleSheet.create({
	wrapper: {
		borderRadius: 8,
		backgroundColor: colors.white
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 16
	},
	information: {
		marginTop: 24
	},
	content: {
		paddingTop: 8,
		lineHeight: 22
	},
	row: {
		marginVertical: 10
	},
	name: {
		fontSize: 24,
		marginBottom: 3
	},
	tokenId: {
		fontSize: 16,
		marginTop: 3
	},
	userContainer: {
		marginBottom: 16,
		flexDirection: 'row'
	},
	userImage: {
		width: 38,
		height: 38,
		borderRadius: 100,
		marginRight: 8,
		marginTop: 2
	},
	buttonContainer: {
		flexDirection: 'row',
		marginTop: 16
	},
	sendButton: {
		height: 54,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		marginRight: 9
	},
	iconButtons: {
		width: 54,
		height: 54,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		marginRight: 9
	},
	collectibleInfoContainer: {
		flexDirection: 'row',
		marginBottom: 12
	},
	collectibleInfoKey: {
		paddingRight: 10
	},
	collectibleInfoValue: {
		flex: 1
	},
	username: {
		marginBottom: 2
	},
	userInfoContainer: {
		justifyContent: 'center'
	},
	titleWrapper: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 100,
		paddingVertical: 16,
		backgroundColor: colors.white
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey100
	}
});

/**
 * View that displays the information of a specific ERC-721 Token
 */
const CollectibleOverview = ({
	chainId,
	collectible,
	selectedAddress,
	tradable,
	onSend,
	addFavoriteCollectible,
	removeFavoriteCollectible,
	isInFavorites,
	openLink
}) => {
	const [marginTop, setMarginTop] = useState(-80);
	const [draggerPosition, setDraggerPosition] = useState(0);
	const [headerHeight, setHeaderHeight] = useState();

	const draggerRef = useRef();

	const renderCollectibleInfoRow = (key, value, onPress) => {
		if (!value) return null;
		return (
			<View style={styles.collectibleInfoContainer} key={key}>
				<Text noMargin black bold big style={styles.collectibleInfoKey}>
					{key}
				</Text>
				<Text
					noMargin
					big
					link={!!onPress}
					black={!onPress}
					right
					style={styles.collectibleInfoValue}
					numberOfLines={1}
					ellipsizeMode="middle"
					onPress={onPress}
				>
					{value}
				</Text>
			</View>
		);
	};

	const renderCollectibleInfo = () => [
		renderCollectibleInfoRow(
			strings('collectible.collectible_last_sold'),
			collectible?.lastSale?.event_timestamp &&
				toLocaleDate(new Date(collectible?.lastSale?.event_timestamp)).toString()
		),
		renderCollectibleInfoRow(
			strings('collectible.collectible_last_price_sold'),
			collectible?.lastSale?.total_price && `${renderFromWei(collectible?.lastSale?.total_price)} ETH`
		),
		renderCollectibleInfoRow(strings('collectible.collectible_source'), collectible?.imageOriginal, () =>
			openLink(collectible?.imageOriginal)
		),
		renderCollectibleInfoRow(strings('collectible.collectible_link'), collectible?.externalLink, () =>
			openLink(collectible?.externalLink)
		),
		renderCollectibleInfoRow(
			strings('collectible.collectible_asset_contract'),
			renderShortAddress(collectible?.address),
			() => openLink(etherscanLink.createTokenTrackerLink(collectible?.address, chainId))
		)
	];

	const collectibleToFavorites = () => {
		if (!isInFavorites) {
			addFavoriteCollectible(selectedAddress, chainId, collectible);
		} else {
			removeFavoriteCollectible(selectedAddress, chainId, collectible);
		}
	};

	const shareCollectible = () => {
		if (!collectible?.externalLink) return;
		Share.open({
			message: `${strings('collectible.share_check_out_nft')} ${collectible.externalLink}\n${strings(
				'collectible.share_via'
			)} MetaMask.io`
		});
	};

	const onHeaderLayout = ({
		nativeEvent: {
			layout: { height }
		}
	}) => setHeaderHeight(height);

	const handleGesture = evt => {
		const newMargin = evt.nativeEvent.absoluteY - draggerPosition;
		if (newMargin > -80 && evt.nativeEvent.absoluteY < DEVICE_HEIGHT - headerHeight) setMarginTop(newMargin);
	};

	useLayoutEffect(() => {
		setTimeout(() => {
			draggerRef.current.measure((w, h, draggerY) => {
				setDraggerPosition(draggerY);
			});
		}, 500);
	}, []);

	return (
		<View style={baseStyles.flexGrow}>
			<ScrollView style={[styles.wrapper, { marginTop }]}>
				<TouchableWithoutFeedback>
					<View>
						<PanGestureHandler onGestureEvent={handleGesture}>
							<View style={styles.titleWrapper} ref={draggerRef}>
								<View style={styles.dragger} />
							</View>
						</PanGestureHandler>
						<View style={styles.informationWrapper}>
							<View onLayout={onHeaderLayout}>
								{collectible?.creator && (
									<View style={styles.userContainer}>
										<RemoteImage
											fadeIn
											placeholderStyle={{ backgroundColor: colors.white }}
											source={{ uri: collectible.creator.profile_img_url }}
											style={styles.userImage}
										/>
										<View style={styles.userInfoContainer}>
											{collectible.creator.user?.username && (
												<Text black bold noMargin big style={styles.username}>
													{collectible.creator.user.username}
												</Text>
											)}
											<Text black noMargin small>
												{collectible.contractName}
											</Text>
										</View>
									</View>
								)}
								<Text bold primary noMargin style={styles.name}>
									{collectible.name}
								</Text>
								<Text primary noMargin style={styles.tokenId}>
									{strings('unit.token_id')}
									{collectible.tokenId}
								</Text>

								<View style={styles.buttonContainer}>
									{tradable && (
										<StyledButton
											onPress={onSend}
											type={'rounded-normal'}
											containerStyle={styles.sendButton}
										>
											<Text link big bold noMargin>
												{strings('asset_overview.send_button')}
											</Text>
										</StyledButton>
									)}
									{collectible?.externalLink && (
										<StyledButton
											type={'rounded-normal'}
											containerStyle={styles.iconButtons}
											onPress={shareCollectible}
										>
											<Text bold link noMargin>
												<EvilIcons
													name={Device.isIos() ? 'share-apple' : 'share-google'}
													size={32}
												/>
											</Text>
										</StyledButton>
									)}
									<StyledButton
										type={'rounded-normal'}
										containerStyle={styles.iconButtons}
										onPress={collectibleToFavorites}
									>
										<Text link noMargin>
											<AntIcons name={isInFavorites ? 'star' : 'staro'} size={24} />
										</Text>
									</StyledButton>
								</View>
							</View>

							{collectible?.description && (
								<View style={styles.information}>
									<View style={styles.row}>
										<Text noMargin black bold big>
											{strings('collectible.collectible_description')}
										</Text>
										<Text noMargin black style={styles.content}>
											{collectible.description}
										</Text>
									</View>
								</View>
							)}
							<View style={styles.information}>{renderCollectibleInfo()}</View>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</ScrollView>
		</View>
	);
};

CollectibleOverview.propTypes = {
	/**
	 * Chain id
	 */
	chainId: PropTypes.string,
	/**
	 * Object that represents the collectible to be displayed
	 */
	collectible: PropTypes.object,
	/**
	 * Represents if the collectible is tradable (can be sent)
	 */
	tradable: PropTypes.bool,
	/**
	 * Function called when user presses the Send button
	 */
	onSend: PropTypes.func,
	/**
	 * Selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * Dispatch add collectible to favorites action
	 */
	addFavoriteCollectible: PropTypes.func,
	/**
	 * Dispatch remove collectible from favorites action
	 */
	removeFavoriteCollectible: PropTypes.func,
	/**
	 * Whether the current collectible is favorited
	 */
	isInFavorites: PropTypes.bool,
	/**
	 * Function to open a link on a webview
	 */
	openLink: PropTypes.func.isRequired
};

const mapStateToProps = (state, props) => {
	const favoriteCollectibles = favoritesCollectiblesObjectSelector(state);
	return {
		chainId: state.engine.backgroundState.NetworkController.provider.chainId,
		selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
		isInFavorites: isCollectibleInFavorites(favoriteCollectibles, props.collectible)
	};
};
const mapDispatchToProps = dispatch => ({
	addFavoriteCollectible: (selectedAddress, chainId, collectible) =>
		dispatch(addFavoriteCollectible(selectedAddress, chainId, collectible)),
	removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
		dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(CollectibleOverview);
