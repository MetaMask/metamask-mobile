import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, Image, StyleSheet, View } from 'react-native';
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
				<Title>Bank transfer or debit card</Title>
				<Text bold>Requires registration</Text>
				<Text disclaimer>Options and fees vary based on location</Text>
			</PaymentMethod.Details>
			<PaymentMethod.Terms>
				<TransakLogo />
				<ModalHandler>
					{({ isVisible, toggleModal }) => (
						<>
							<TouchableOpacity onPress={toggleModal}>
								<PaymentMethod.InfoIconLine>
									<Text bold small>
										32+ countries
									</Text>
									<PaymentMethod.InfoIcon />
								</PaymentMethod.InfoIconLine>
							</TouchableOpacity>
							<PaymentMethod.Modal isVisible={isVisible} dismiss={toggleModal} title="Transak Support">
								<Text modal>
									Exact payment methods and fees vary depending on location. Supported countries are:
								</Text>
								<Text modal>
									Austria 🇦🇹, Belgium 🇧🇪, Cyprus 🇨🇾, Czechia 🇨🇿, Estonia 🇪🇪, Finland 🇫🇮, France 🇫🇷,
									Germany 🇩🇪, Greece 🇬🇷, Ireland 🇮🇪, Italy 🇮🇹, Latvia 🇱🇻, Luxembourg 🇱🇺, Malta 🇹,
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
					Buy ETH with Transak
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
