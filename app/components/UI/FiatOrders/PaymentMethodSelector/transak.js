import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, Image, StyleSheet, ScrollView, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';
import ModalHandler from '../../../Base/ModalHandler';
import StyledButton from '../../StyledButton';
import Device from '../../../../util/Device';

const style = StyleSheet.create({
	logo: {
		marginVertical: 5,
		aspectRatio: 95 / 25,
		width: Device.isIphone5() ? 80 : 95,
		height: Device.isIphone5() ? 20 : 25
	},
	cta: {
		marginTop: 25,
		marginBottom: 5
	},
	countryList: {
		flexDirection: 'row'
	},
	countryCol: {
		width: '50%'
	}
});

// eslint-disable-next-line import/no-commonjs
const TransakLogoIcon = require('../../../../images/TransakLogo.png');

const TransakLogo = () => <Image source={TransakLogoIcon} style={style.logo} />;

const TransakPaymentMethod = ({ onPress }) => (
	<PaymentMethod onPress={onPress}>
		<PaymentMethod.Content>
			<PaymentMethod.Details>
				<Title>{strings('fiat_on_ramp.bank_transfer_debit')}</Title>
				<Text bold>{strings('fiat_on_ramp.requires_registration')}</Text>
				<Text disclaimer>{strings('fiat_on_ramp.options_fees_vary')}</Text>
			</PaymentMethod.Details>
			<PaymentMethod.Terms>
				<TransakLogo />
				<ModalHandler>
					{({ isVisible, toggleModal }) => (
						<>
							<TouchableOpacity onPress={toggleModal}>
								<PaymentMethod.InfoIconLine>
									<Text bold small>
										32+ {strings('fiat_on_ramp.countries')}
									</Text>
									<PaymentMethod.InfoIcon />
								</PaymentMethod.InfoIconLine>
							</TouchableOpacity>
							<PaymentMethod.Modal
								isVisible={isVisible}
								dismiss={toggleModal}
								title={strings('fiat_on_ramp.modal_transak_support')}
							>
								<Text modal>{strings('fiat_on_ramp.transak_modal_text')}</Text>
								<View style={style.countryList}>
									<ScrollView contentContainerStyle={style.countryList}>
										<View style={style.countryCol}>
											<Text modal>Austria 🇦🇹</Text>
											<Text modal>Belgium 🇧🇪</Text>
											<Text modal>Cyprus 🇨🇾</Text>
											<Text modal>Czechia 🇨🇿</Text>
											<Text modal>Estonia 🇪🇪</Text>
											<Text modal>Finland 🇫🇮</Text>
											<Text modal>France 🇫🇷</Text>
											<Text modal>Germany 🇩🇪</Text>
											<Text modal>Greece 🇬🇷</Text>
											<Text modal>Ireland 🇮🇪</Text>
											<Text modal>Italy 🇮🇹</Text>
										</View>
										<View style={style.countryCol}>
											<Text modal>Latvia 🇱🇻</Text>
											<Text modal>Luxembourg 🇱🇺</Text>
											<Text modal>Malta 🇲🇹</Text>
											<Text modal>Netherlands 🇳🇱</Text>
											<Text modal>Portugal 🇵🇹</Text>
											<Text modal>Romania 🇷🇴</Text>
											<Text modal>Slovakia 🇸🇰</Text>
											<Text modal>Slovenia 🇸🇮</Text>
											<Text modal>Spain 🇪🇸</Text>
											<Text modal>United Kingdom 🇬🇧</Text>
										</View>
									</ScrollView>
								</View>
							</PaymentMethod.Modal>
						</>
					)}
				</ModalHandler>
			</PaymentMethod.Terms>
		</PaymentMethod.Content>
		{Device.isAndroid() && (
			<View>
				<StyledButton type={'blue'} containerStyle={style.cta} onPress={onPress}>
					{strings('fiat_on_ramp.transak_cta')}
				</StyledButton>
			</View>
		)}
	</PaymentMethod>
);

TransakPaymentMethod.propTypes = {
	onPress: PropTypes.func
};
TransakPaymentMethod.defaultProps = {
	onPress: undefined
};

export default TransakPaymentMethod;
