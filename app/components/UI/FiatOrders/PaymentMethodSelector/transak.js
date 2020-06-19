import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, Image, StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';
import ModalHandler from '../components/ModalHandler';
import StyledButton from '../../StyledButton';
import Device from '../../../../util/Device';

const style = StyleSheet.create({
	logo: {
		marginVertical: 5
	},
	cta: {
		marginTop: 25,
		marginBottom: 5
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
								<Text modal>
									Austria 🇦🇹, Belgium 🇧🇪, Cyprus 🇨🇾, Czechia 🇨🇿, Estonia 🇪🇪, Finland 🇫🇮, France 🇫🇷,
									Germany 🇩🇪, Greece 🇬🇷, Ireland 🇮🇪, Italy 🇮🇹, Latvia 🇱🇻, Luxembourg 🇱🇺, Malta 🇲🇹,
									Netherlands 🇳🇱, Portugal 🇵🇹, Romania 🇷🇴, Slovakia 🇸🇰, Slovenia 🇸🇮, Spain 🇪🇸, United
									Kingdom 🇬🇧
								</Text>
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
