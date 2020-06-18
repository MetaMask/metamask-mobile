import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useWyreTerms, WYRE_IS_PROMOTION, WYRE_FEE_PERCENT, WYRE_FEE_FLAT } from '../orderProcessor/wyreApplePay';
import PaymentMethod from '../components/PaymentMethod';

import Text from '../../../Base/Text';
import Title from '../components/Title';
import { NavigationContext } from 'react-navigation';
import ModalHandler from '../components/ModalHandler';

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
			<PaymentMethod.Badge>Best deal</PaymentMethod.Badge>
			<PaymentMethod.Content>
				<PaymentMethod.Details>
					<Text reset>
						<Title>Apple Pay</Title> <Text>via</Text> <WyreLogo />
					</Text>
					<Text>
						{WYRE_IS_PROMOTION ? (
							<>
								<Text bold strikethrough>
									2.9% + $0.30
								</Text>{' '}
								<Text bold green>
									0% fee
								</Text>
								{'\n'}
								<Text disclaimer>limited time</Text>
							</>
						) : (
							<Text bold>
								Fee ~{WYRE_FEE_PERCENT.toFixed(2)}% + ${WYRE_FEE_FLAT.toFixed(2)}
							</Text>
						)}
					</Text>
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
