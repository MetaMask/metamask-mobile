import React from 'react';
import { View, Text, Linking, Alert } from 'react-native';
import styles from './style';
import PropTypes from 'prop-types';
import AntIcon from 'react-native-vector-icons/AntDesign';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import LineDivide from '../../../components/Base/LineDivide';

const Description = ({ description, action, currency, description_2, number, onPress }) => (
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

const showAlertView = (url) => {
	Alert.alert(strings('network_information.error_title'), strings('network_information.error_message'));
};

const openUrl = (url) => {
	Linking.canOpenURL(url).then((supported) => {
		if (supported) {
			Linking.openURL(url);
		} else {
			showAlertView(url);
		}
	});
};

const NetworkInfo = ({ onClose, type, currency }) => (
	<View style={styles.wrapper}>
		<AntIcon name="close" onPress={onClose} size={18} style={styles.closeIcon} />
		<View style={styles.modalContentView}>
			<Text style={styles.title}>You have switched to</Text>
			<View style={styles.tokenType}>
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
				/>
				<Description
					description={strings('network_information.description_2')}
					action={strings('network_information.learn_more')}
					number={2}
					onPress={() => openUrl('https://metamask.zendesk.com/hc/en-us/articles/4404424659995')}
				/>
				<Description
					description={strings('network_information.description_3')}
					action={strings('network_information.add_token')}
					number={3}
					onPress={() => openUrl('https://metamask.zendesk.com/hc/en-us/articles/4404424659995')}
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

Description.propTypes = {
	description: PropTypes.string,
	action: PropTypes.string,
	currency: PropTypes.string,
	description_2: PropTypes.string,
	number: PropTypes.number,
	onPress: PropTypes.func,
};

NetworkInfo.propTypes = {
	onClose: PropTypes.func,
	type: PropTypes.string,
	currency: PropTypes.string,
};

export default NetworkInfo;
