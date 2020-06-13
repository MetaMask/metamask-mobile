import React, { useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { NavigationContext } from 'react-navigation';
import { connect } from 'react-redux';

import { useTransakFlowURL } from '../orderProcessor/transak';
import { useWyreTerms } from '../orderProcessor/wyreApplePay';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';

import Title from '../components/Title';
import Text from '../components/Text';
import Heading from '../components/Heading';
import SubHeader from '../components/SubHeader';
import PaymentMethod from '../components/PaymentMethod';
import ScreenView from '../components/ScreenView';
import ModalHandler from '../components/ModalHandler';

const logosStyle = StyleSheet.create({
	applePay: {
		marginVertical: 3
	},
	transak: {
		marginVertical: 5
	}
});

/* eslint-disable import/no-commonjs */
const ApplePayMarkIcon = require('../images/ApplePayMark.png');
const TransakLogoIcon = require('../images/TransakLogo.png');
const WyreLogoIcon = require('../images/WyreLogo.png');
/* eslint-enable import/no-commonjs */

const ApplePayMark = () => <Image source={ApplePayMarkIcon} style={logosStyle.applePay} />;
const TransakLogo = () => <Image source={TransakLogoIcon} style={logosStyle.transak} />;
const WyreLogo = () => <Image source={WyreLogoIcon} style={logosStyle.wyre} />;

function PaymentMethodSelectorView({ selectedAddress, ...props }) {
	const navigation = useContext(NavigationContext);
	const transakURL = useTransakFlowURL(selectedAddress);

	const handleWyreTerms = useWyreTerms(navigation);

	const onPressApplePay = useCallback(() => navigation.navigate('PaymentMethodApplePay'), [navigation]);
	const onPressTransak = useCallback(() => {
		navigation.navigate('TransakFlow', {
			url: transakURL,
			title: 'Transak'
		});
	}, [navigation, transakURL]);

	return (
		<ScreenView>
			<Heading>
				<Title centered hero>
					<Text reset>0% fee when you use</Text>
					{'\n'}
					<Text reset>Apple Pay.</Text>
				</Title>
				<SubHeader centered>Valid until July 1st, 2020</SubHeader>
			</Heading>

			<PaymentMethod onPress={onPressApplePay}>
				<PaymentMethod.Badge>Best deal</PaymentMethod.Badge>
				<PaymentMethod.Details>
					<Text reset>
						<Title>Apple Pay</Title> <Text>via</Text> <WyreLogo />
					</Text>
					<Text bold>0% fee (limited time)</Text>
					<Text>1 - 2 minutes</Text>
					<Text>Max $450 weekly</Text>
					<Text>Requires debit card</Text>
				</PaymentMethod.Details>
				<PaymentMethod.Terms>
					<ApplePayMark />
					<ModalHandler>
						{({ isVisible, toggleModal }) => (
							<>
								<TouchableOpacity onPress={toggleModal}>
									<PaymentMethod.InfoIconLine>
										<Text bold small>
											🇺🇸 U.S. only
										</Text>
										<PaymentMethod.InfoIcon />
									</PaymentMethod.InfoIconLine>

									<Text right disclaimer>
										Some states excluded
									</Text>
								</TouchableOpacity>

								<PaymentMethod.Modal isVisible={isVisible} dismiss={toggleModal} title="Wyre Support">
									<Text modal>
										Paying with Apple Pay, powered by Wyre is supported in the United Sates 🇺🇸
										except for CT, HI, NC, NH, NY, VA and VT.{' '}
										<Text
											modal
											link
											// eslint-disable-next-line react/jsx-no-bind
											onPress={() => {
												toggleModal();
												handleWyreTerms();
											}}
										>
											Wyre terms of service apply.
										</Text>
									</Text>
								</PaymentMethod.Modal>
							</>
						)}
					</ModalHandler>
				</PaymentMethod.Terms>
			</PaymentMethod>

			<PaymentMethod onPress={onPressTransak}>
				<PaymentMethod.Details>
					<Title>Bank transfer or debit card</Title>
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
								<PaymentMethod.Modal
									isVisible={isVisible}
									dismiss={toggleModal}
									title="Transak Support"
								>
									<Text modal>
										Exact payment methods and fees vary depending on location. Supported countries
										are: Austria 🇦🇹, Belgium 🇧🇪, Cyprus 🇨🇾, Czechia 🇨🇿, Estonia 🇪🇪, Finland 🇫🇮,
										France 🇫🇷, Germany 🇩🇪, Greece 🇬🇷, Ireland 🇮🇪, Italy 🇮🇹, Latvia 🇱🇻, Luxembourg
										🇱🇺, Malta 🇲🇹, Netherlands 🇳🇱, Portugal 🇵🇹, Romania 🇷🇴, Slovakia 🇸🇰, Slovenia 🇸🇮,
										Spain 🇪🇸, United Kingdom 🇬🇧
									</Text>
								</PaymentMethod.Modal>
							</>
						)}
					</ModalHandler>
				</PaymentMethod.Terms>
			</PaymentMethod>
		</ScreenView>
	);
}

PaymentMethodSelectorView.propTypes = {
	selectedAddress: PropTypes.string.isRequired
};

PaymentMethodSelectorView.navigationOptions = ({ navigation }) =>
	getPaymentSelectorMethodNavbar('Purchase Method', navigation);

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(PaymentMethodSelectorView);
