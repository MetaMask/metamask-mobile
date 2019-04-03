import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import ActionView from '../ActionView';
import { renderFromTokenMinimalUnit } from '../../../util/number';
import TokenImage from '../../UI/TokenImage';
import DeviceSize from '../../../util/DeviceSize';
import Engine from '../../../core/Engine';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: '90%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingBottom: DeviceSize.isIphoneX() ? 20 : 0
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	text: {
		...fontStyles.normal,
		fontSize: 16,
		paddingTop: 25,
		paddingHorizontal: 10
	},
	accountInformation: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		margin: 20,
		marginBottom: 40
	},
	accountInfoCol: {
		flex: 1
	},
	account: {
		flex: 1,
		flexDirection: 'row'
	},
	identicon: {
		padding: 10
	},
	signText: {
		...fontStyles.normal,
		fontSize: 16,
		padding: 5,
		textAlign: 'center'
	},
	addMessage: {
		flex: 1,
		flexDirection: 'row',
		marginVertical: 10,
		marginHorizontal: 20
	},
	children: {
		flex: 1,
		borderTopColor: colors.lightGray,
		borderTopWidth: 1,
		height: '100%'
	}
});

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

/**
 * Component that renders watch asset content
 */
class WatchAssetRequest extends Component {
	static propTypes = {
		/**
		 * Callback triggered when this message signature is rejected
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this message signature is approved
		 */
		onConfirm: PropTypes.func,
		/**
		 * Token object
		 */
		suggestedAssetMeta: PropTypes.object,
		/**
		 * Object containing token balances in the format address => balance
		 */
		tokenBalances: PropTypes.object
	};

	componentWillUnmount = async () => {
		const { AssetsController } = Engine.context;
		const { suggestedAssetMeta } = this.props;
		await AssetsController.rejectWatchAsset(suggestedAssetMeta.id);
	};

	onConfirm = async () => {
		const { onConfirm, suggestedAssetMeta } = this.props;
		const { AssetsController } = Engine.context;
		await AssetsController.acceptWatchAsset(suggestedAssetMeta.id);
		onConfirm && onConfirm();
	};

	render() {
		const {
			suggestedAssetMeta: { asset },
			tokenBalances
		} = this.props;
		const balance =
			asset.address in tokenBalances
				? renderFromTokenMinimalUnit(tokenBalances[asset.address], asset.decimals)
				: '0';
		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						{strings('watch_asset_request.title')}
					</Text>
				</View>
				<ActionView
					cancelTestID={'request-signature-cancel-button'}
					confirmTestID={'request-signature-confirm-button'}
					cancelText={strings('watch_asset_request.cancel')}
					confirmText={strings('watch_asset_request.add')}
					onCancelPress={this.props.onCancel}
					onConfirmPress={this.onConfirm}
				>
					<View style={styles.children}>
						<View style={styles.addMessage}>
							<Text style={styles.signText}>{strings('watch_asset_request.message')}</Text>
						</View>
						<View style={styles.accountInformation}>
							<View style={styles.accountInfoCol}>
								<Text>{strings('watch_asset_request.token')}</Text>
								<View style={styles.account}>
									<View style={styles.identicon}>
										<TokenImage
											asset={{
												...asset,
												logo: asset.image
											}}
											logoDefined
										/>
									</View>
									<Text style={styles.text}>{asset.symbol}</Text>
								</View>
							</View>
							<View style={styles.accountInfoCol}>
								<Text>{strings('watch_asset_request.balance')}</Text>
								<Text style={styles.text}>
									{balance} {asset.symbol}
								</Text>
							</View>
						</View>
					</View>
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances
});

export default connect(mapStateToProps)(WatchAssetRequest);
