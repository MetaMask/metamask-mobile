import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Image, TouchableOpacity } from 'react-native';
import { NavigationContext } from 'react-navigation';
import { strings } from '../../../../../locales/i18n';
import { useWyreTerms } from '../orderProcessor/wyreApplePay';

import PaymentMethod from '../components/PaymentMethod';

import ModalHandler from '../../../Base/ModalHandler';
import Text from '../../../Base/Text';
import Title from '../components/Title';

const logosStyle = StyleSheet.create({
	applePay: {
		marginVertical: 3
	}
});

/* eslint-disable import/no-commonjs */
const ApplePayMarkIcon = require('../../../../images/ApplePayMark.png');
const WyreLogoIcon = require('../../../../images/WyreLogo.png');
/* eslint-enable import/no-commonjs */

const ApplePayMark = () => <Image source={ApplePayMarkIcon} style={logosStyle.applePay} />;
const WyreLogo = () => <Image source={WyreLogoIcon} style={logosStyle.wyre} />;

const WyreApplePayPaymentMethod = ({ onPress }) => {
	const navigation = useContext(NavigationContext);
	const handleWyreTerms = useWyreTerms(navigation);

	return (
		<PaymentMethod onPress={onPress}>
			<PaymentMethod.Badge>{strings('fiat_on_ramp.best_deal')}</PaymentMethod.Badge>
			<PaymentMethod.Content>
				<PaymentMethod.Details>
					<Text reset>
						<Title>{strings('fiat_on_ramp.apple_pay')}</Title> <Text>{strings('fiat_on_ramp.via')}</Text>{' '}
						<WyreLogo />
					</Text>
					<Text>{strings('fiat_on_ramp.wyre_minutes')}</Text>
					<Text>{strings('fiat_on_ramp.wyre_max')}</Text>
					<Text>{strings('fiat_on_ramp.wyre_requires_debit_card')}</Text>
				</PaymentMethod.Details>
				<PaymentMethod.Terms>
					<ApplePayMark />
					<ModalHandler>
						{({ isVisible, toggleModal }) => (
							<>
								<TouchableOpacity onPress={toggleModal}>
									<PaymentMethod.InfoIconLine>
										<Text bold small>
											{strings('fiat_on_ramp.wyre_us_only')}
										</Text>
										<PaymentMethod.InfoIcon />
									</PaymentMethod.InfoIconLine>

									<Text right disclaimer>
										{strings('fiat_on_ramp.some_states_excluded')}
									</Text>
								</TouchableOpacity>

								<PaymentMethod.Modal
									isVisible={isVisible}
									dismiss={toggleModal}
									title={strings('fiat_on_ramp.modal_wyre_support')}
								>
									<Text modal>
										{strings('fiat_on_ramp.wyre_modal_text')}{' '}
										<Text
											modal
											link
											// eslint-disable-next-line react/jsx-no-bind
											onPress={() => {
												toggleModal();
												handleWyreTerms();
											}}
										>
											{strings('fiat_on_ramp.wyre_modal_terms_of_service_apply')}
										</Text>
									</Text>
								</PaymentMethod.Modal>
							</>
						)}
					</ModalHandler>
				</PaymentMethod.Terms>
			</PaymentMethod.Content>
		</PaymentMethod>
	);
};

WyreApplePayPaymentMethod.propTypes = {
	onPress: PropTypes.func
};
WyreApplePayPaymentMethod.defaultProps = {
	onPress: undefined
};
export default WyreApplePayPaymentMethod;
