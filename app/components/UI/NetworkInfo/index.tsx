import React from 'react';
import { View, Text, Linking, Alert, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import AntIcon from 'react-native-vector-icons/AntDesign';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import LineDivide from '../../Base/LineDivide';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';

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
	tokenType: {
		backgroundColor: colors.grey100,
		marginRight: 50,
		marginLeft: 50,
		padding: 10,
		borderRadius: 40,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 30,
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
});

interface NetworkInfoProps {
	onClose: () => void;
	type: string;
	currency: string;
}

interface DescriptionProps {
	description: string;
	action: string | undefined;
	currency: string | undefined;
	description_2: string | undefined;
	number: number;
	onPress: () => void | undefined;
}

const Description = (props: DescriptionProps) => {
	const { description, action, currency, description_2, number, onPress } = props;
	return (
		<View style={styles.descriptionContainer}>
			<View style={styles.contentContainer}>
				<Text style={styles.numberStyle}>{number}.</Text>
				<Text style={styles.description}>
					<Text>{description}</Text>
					{currency && <Text> {currency}. </Text>}
					<Text>{description_2}</Text>
					{action && (
						<Text onPress={onPress} style={styles.link}>
							{' '}
							{action}
						</Text>
					)}
				</Text>
			</View>
			<LineDivide />
		</View>
	);
};

const showAlertView = () => {
	Alert.alert(strings('network_information.error_title'), strings('network_information.error_message'));
};

const openUrl = (url: string) => {
	Linking.canOpenURL(url).then((supported) => {
		if (supported) {
			Linking.openURL(url);
		} else {
			showAlertView();
		}
	});
};

const NetworkInfo = (props: NetworkInfoProps): JSX.Element => {
	const { onClose, type, currency } = props;
	return (
		<View style={styles.wrapper}>
			<AntIcon name="close" onPress={onClose} size={18} style={styles.closeIcon} />
			<View style={styles.modalContentView}>
				<Text style={styles.title}>You have switched to</Text>
				<View style={styles.tokenType}>
					<NetworkMainAssetLogo big style={styles.ethLogo} testID={'eth-logo'} symbol={currency} />
					<Text style={styles.tokenText}>
						{currency === 'ETH' ? [type === 'mainnet' ? `Ethereum ${type}` : `${type} testnet`] : type}
					</Text>
				</View>
				<Text style={styles.messageTitle}>Things to keep in mind:</Text>
				<View style={styles.descriptionViews}>
					<Description
						description={strings('network_information.description_1a')}
						currency={currency}
						description_2={strings('network_information.description_1b')}
						number={1}
						action={undefined}
						onPress={undefined}
					/>
					<Description
						description={strings('network_information.description_2')}
						action={strings('network_information.learn_more')}
						number={2}
						onPress={() => openUrl('https://metamask.zendesk.com/hc/en-us/articles/4404424659995')}
						currency={undefined}
						description_2={undefined}
					/>
					<Description
						description={strings('network_information.description_3')}
						action={strings('network_information.add_token')}
						number={3}
						onPress={() => openUrl('https://metamask.zendesk.com/hc/en-us/articles/4404424659995')}
						currency={undefined}
						description_2={undefined}
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
