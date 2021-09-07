import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, Image, StyleSheet, ScrollView, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import Device from '../../../../util/device';
import useModalHandler from '../../../Base/hooks/useModalHandler';

const styles = StyleSheet.create({
	title: {
		flex: 1,
		flexWrap: 'wrap',
	},
	logo: {
		marginVertical: 5,
		aspectRatio: 95 / 25,
		width: Device.isIphone5() ? 80 : 95,
		height: Device.isIphone5() ? 20 : 25,
		marginLeft: 5,
	},
	cta: {
		marginTop: 25,
		marginBottom: 5,
	},
	countryList: {
		flexDirection: 'row',
	},
	countryCol: {
		width: '50%',
	},
	spacer: {
		marginVertical: 5,
	},
});

// eslint-disable-next-line import/no-commonjs
const TransakLogoIcon = require('../../../../images/TransakLogo.png');
const TransakLogo = () => <Image source={TransakLogoIcon} style={styles.logo} />;

const TransakPaymentMethod = ({ onPress }) => {
	const [isVisible, , showModal, hideModal] = useModalHandler(false);
	return (
		<PaymentMethod onPress={onPress}>
			<PaymentMethod.Content>
				<PaymentMethod.Details>
					<PaymentMethod.Title>
						<Title style={styles.title}>{strings('fiat_on_ramp.bank_transfer_debit')}</Title>
						<TransakLogo />
					</PaymentMethod.Title>
					<Text bold>{strings('fiat_on_ramp.requires_registration')}</Text>
					<Text>{strings('fiat_on_ramp.credit_debit_location')}</Text>
					<TouchableOpacity onPress={showModal}>
						<PaymentMethod.InfoIconLine>
							<Text small>{strings('fiat_on_ramp.options_fees_vary')}</Text>
							<PaymentMethod.InfoIcon />
						</PaymentMethod.InfoIconLine>
					</TouchableOpacity>
					<PaymentMethod.Modal
						isVisible={isVisible}
						dismiss={hideModal}
						title={strings('fiat_on_ramp.modal_transak_support')}
					>
						<Text modal bold>
							{strings('fiat_on_ramp.Fees')}
						</Text>
						<Text modal>{strings('fiat_on_ramp.transak_modal_text')}</Text>
						<View style={styles.spacer} />

						<Text modal bold>
							{strings('fiat_on_ramp.supported_countries_title')}
						</Text>
						<View style={styles.countryList}>
							<ScrollView contentContainerStyle={styles.countryList}>
								<View style={styles.countryCol}>
									<Text primary>Algeria 🇩🇿</Text>
									<Text primary>Argentina 🇦🇷</Text>
									<Text primary>Austria 🇦🇹</Text>
									<Text primary>Australia 🇦🇺</Text>
									<Text primary>Belarus 🇧🇾</Text>
									<Text primary>Belgium 🇧🇪</Text>
									<Text primary>Bolivia 🇧🇴</Text>
									<Text primary>Brazil 🇧🇷</Text>
									<Text primary>Canada 🇨🇦</Text>
									<Text primary>Chile 🇨🇱</Text>
									<Text primary>Colombia 🇨🇴</Text>
									<Text primary>Costa Rica 🇨🇷</Text>
									<Text primary>Cyprus 🇨🇾</Text>
									<Text primary>Czechia 🇨🇿</Text>
									<Text primary>Denmark 🇩🇰</Text>
									<Text primary>Dominican Republic 🇩🇴</Text>
									<Text primary>Estonia 🇪🇪</Text>
									<Text primary>Finland 🇫🇮</Text>
									<Text primary>France 🇫🇷</Text>
									<Text primary>Germany 🇩🇪</Text>
									<Text primary>Greece 🇬🇷</Text>
									<Text primary>Hong Kong 🇭🇰</Text>
									<Text primary>Iceland 🇮🇸</Text>
									<Text primary>India 🇮🇳</Text>
									<Text primary>Indonesia 🇮🇩</Text>
									<Text primary>Ireland 🇮🇪</Text>
									<Text primary>Israel 🇮🇱</Text>
									<Text primary>Italy 🇮🇹</Text>
									<Text primary>India 🇮🇳</Text>
									<Text primary>Latvia 🇱🇻</Text>
								</View>
								<View style={styles.countryCol}>
									<Text primary>Japan 🇯🇵</Text>
									<Text primary>Luxembourg 🇱🇺</Text>
									<Text primary>Malta 🇲🇹</Text>
									<Text primary>Mexico 🇲🇽</Text>
									<Text primary>Romania 🇷🇴</Text>
									<Text primary>Malaysia 🇲🇾</Text>
									<Text primary>Nepal 🇳🇵</Text>
									<Text primary>Netherlands 🇳🇱</Text>
									<Text primary>New Zealand 🇳🇿</Text>
									<Text primary>Norway 🇳🇴</Text>
									<Text primary>Paraguay 🇵🇾</Text>
									<Text primary>Peru 🇵🇪</Text>
									<Text primary>Philippines 🇵🇭</Text>
									<Text primary>Poland 🇵🇱</Text>
									<Text primary>Portugal 🇵🇹</Text>
									<Text primary>Singapore 🇸🇬</Text>
									<Text primary>Slovakia 🇸🇰</Text>
									<Text primary>Slovenia 🇸🇮</Text>
									<Text primary>South Africa 🇿🇦</Text>
									<Text primary>South Korea 🇰🇷</Text>
									<Text primary>Spain 🇪🇸</Text>
									<Text primary>Sweden 🇸🇪</Text>
									<Text primary>Switzerland 🇨🇭</Text>
									<Text primary>Tanzania 🇹🇿</Text>
									<Text primary>Thailand 🇹🇭</Text>
									<Text primary>Turkey 🇹🇷</Text>
									<Text primary>United Kingdom 🇬🇧</Text>
									<Text primary>Vietnam 🇻🇳</Text>
									<Text primary>USA 🇺🇸</Text>
								</View>
							</ScrollView>
						</View>
					</PaymentMethod.Modal>
				</PaymentMethod.Details>
			</PaymentMethod.Content>
			{Device.isAndroid() && (
				<View>
					<StyledButton type={'blue'} containerStyle={styles.cta} onPress={onPress}>
						{strings('fiat_on_ramp.transak_cta')}
					</StyledButton>
				</View>
			)}
		</PaymentMethod>
	);
};

TransakPaymentMethod.propTypes = {
	onPress: PropTypes.func,
};
TransakPaymentMethod.defaultProps = {
	onPress: undefined,
};

export default TransakPaymentMethod;
