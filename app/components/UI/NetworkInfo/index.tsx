import React from 'react';
import { View, Text, Linking, Alert, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import AntIcon from 'react-native-vector-icons/AntDesign';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import LineDivide from '../../Base/LineDivide';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { ETH, PRIVATENETWORK } from '../../../util/custom-gas';
import AssetIcon from '../../UI/AssetIcon';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 10,
	},
	closeIcon: {
		...StyleSheet.absoluteFillObject,
		alignSelf: 'flex-end',
		marginTop: 10,
		marginRight: 10,
		position: 'relative',
		padding: 10,
	},
	modalContentView: {
		padding: 20,
	},
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		marginVertical: 10,
		textAlign: 'center',
	},
	tokenView: {
		marginBottom: 30,
	},
	tokenType: {
		backgroundColor: colors.grey100,
		marginRight: 50,
		marginLeft: 50,
		padding: 10,
		borderRadius: 40,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	ethLogo: {
		width: 30,
		height: 30,
		overflow: 'hidden',
		marginHorizontal: 5,
	},
	tokenText: {
		fontSize: 15,
		textTransform: 'capitalize',
	},
	messageTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		marginBottom: 15,
		textAlign: 'center',
	},
	descriptionViews: {
		marginBottom: 15,
	},
	descriptionContainer: {
		marginBottom: 10,
	},
	contentContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	numberStyle: {
		marginRight: 10,
	},
	description: {
		width: '94%',
	},
	closeButton: {
		marginVertical: 20,
	},
	link: {
		color: colors.blue,
	},
	rpcUrl: {
		fontSize: 10,
		color: colors.grey500,
		textAlign: 'center',
		paddingVertical: 5,
	},
});

interface NetworkInfoProps {
	onClose: () => void;
	type: string;
	nativeToken: string;
}

interface DescriptionProps {
	description: string;
	clickableText: string | undefined;
	number: number;
}

const learnMoreUrl = 'https://metamask.zendesk.com/hc/en-us/articles/4404424659995';

const showAlertView = () => {
	Alert.alert(strings('network_information.error_title'), strings('network_information.error_message'));
};

const openUrl = () => {
	Linking.canOpenURL(learnMoreUrl).then((supported) => {
		if (supported) {
			Linking.openURL(learnMoreUrl);
		} else {
			showAlertView();
		}
	});
};

const Description = (props: DescriptionProps) => {
	const { description, clickableText, number } = props;
	return (
		<View style={styles.descriptionContainer}>
			<View style={styles.contentContainer}>
				<Text style={styles.numberStyle}>{number}.</Text>
				<Text style={styles.description}>
					<Text>{description}</Text>
					{clickableText && (
						<Text onPress={openUrl} style={styles.link}>
							{' '}
							{clickableText}
						</Text>
					)}
				</Text>
			</View>
			<LineDivide />
		</View>
	);
};

const NetworkInfo = (props: NetworkInfoProps): JSX.Element => {
	const { onClose, type, nativeToken } = props;
	return (
		<View style={styles.wrapper}>
			<AntIcon name="close" onPress={onClose} size={18} style={styles.closeIcon} />
			<View style={styles.modalContentView}>
				<Text style={styles.title}>You have switched to</Text>
				<View style={styles.tokenView}>
					<View style={styles.tokenType}>
						{nativeToken === PRIVATENETWORK ? (
							<>
								<AssetIcon />
								<Text style={styles.tokenText}>{strings('network_information.unknown_network')}</Text>
							</>
						) : (
							<>
								<NetworkMainAssetLogo
									big
									style={styles.ethLogo}
									testID={'eth-logo'}
									symbol={nativeToken}
								/>
								<Text style={styles.tokenText}>
									{nativeToken === ETH
										? [type === 'mainnet' ? `Ethereum ${type}` : `${type} testnet`]
										: type}
								</Text>
							</>
						)}
					</View>
					{nativeToken === PRIVATENETWORK && <Text style={styles.rpcUrl}>{type}</Text>}
				</View>
				<Text style={styles.messageTitle}>Things to keep in mind:</Text>
				<View style={styles.descriptionViews}>
					<Description
						description={
							nativeToken === PRIVATENETWORK
								? strings('network_information.private_network')
								: strings('network_information.first_description', { nativeToken })
						}
						number={1}
						clickableText={
							nativeToken === PRIVATENETWORK
								? strings('network_information.add_token_manually')
								: undefined
						}
					/>
					<Description
						description={strings('network_information.second_description')}
						clickableText={strings('network_information.learn_more')}
						number={2}
					/>
					<Description
						description={
							nativeToken === PRIVATENETWORK
								? strings('network_information.private_network_third_description')
								: strings('network_information.third_description')
						}
						clickableText={strings('network_information.add_token')}
						number={3}
					/>
				</View>
				<StyledButton
					type="confirm"
					onPress={onClose}
					containerStyle={styles.closeButton}
					testID={'close-network-info-button'}
				>
					{strings('network_information.got_it')}
				</StyledButton>
			</View>
		</View>
	);
};

export default NetworkInfo;
