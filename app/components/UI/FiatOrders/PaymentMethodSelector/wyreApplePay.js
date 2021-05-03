import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Image, TouchableOpacity, View } from 'react-native';
import { NavigationContext } from 'react-navigation';
import { strings } from '../../../../../locales/i18n';
import { useWyreTerms } from '../orderProcessor/wyreApplePay';

import PaymentMethod from '../components/PaymentMethod';

import Text from '../../../Base/Text';
import Title from '../components/Title';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import { ScrollView } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
	title: {
		flex: 1,
		flexWrap: 'wrap'
	},
	applePay: {
		marginVertical: 3,
		marginLeft: 5,
		marginBottom: '-3%'
	},
	countryList: {
		flexDirection: 'row'
	},
	countryCol: {
		width: '50%'
	},
	spacer: {
		marginVertical: 5
	}
});

/* eslint-disable import/no-commonjs */
const ApplePayMarkIcon = require('../../../../images/ApplePayMark.png');
const WyreLogoIcon = require('../../../../images/WyreLogo.png');
/* eslint-enable import/no-commonjs */

const ApplePayMark = () => <Image source={ApplePayMarkIcon} style={styles.applePay} />;
const WyreLogo = () => <Image source={WyreLogoIcon} style={styles.wyre} />;

const WyreApplePayPaymentMethod = ({ onPress }) => {
	const navigation = useContext(NavigationContext);
	const [isVisible, , showModal, hideModal] = useModalHandler(false);
	const handleWyreTerms = useWyreTerms(navigation);

	return (
		<PaymentMethod onPress={onPress}>
			<PaymentMethod.Content>
				<PaymentMethod.Details>
					<PaymentMethod.Title>
						<Text reset style={styles.title}>
							<Title>{strings('fiat_on_ramp.apple_pay')}</Title>{' '}
							<Text>{strings('fiat_on_ramp.via')}</Text> <WyreLogo />
						</Text>
						<ApplePayMark />
					</PaymentMethod.Title>
					<Text bold>{strings('fiat_on_ramp.fast_plus_lower_fees')}</Text>
					<Text>{strings('fiat_on_ramp.debit_card_required')}</Text>
					<TouchableOpacity onPress={showModal}>
						<PaymentMethod.InfoIconLine>
							<Text>
								<Text small>{strings('fiat_on_ramp.wyre_countries')}</Text> <PaymentMethod.InfoIcon />
							</Text>
						</PaymentMethod.InfoIconLine>
					</TouchableOpacity>

					<PaymentMethod.Modal
						isVisible={isVisible}
						dismiss={hideModal}
						title={strings('fiat_on_ramp.modal_wyre_support')}
					>
						<Text modal bold>
							{strings('fiat_on_ramp.wyre_fees_us_title')}
						</Text>
						<Text modal>{strings('fiat_on_ramp.wyre_fees_us')}</Text>
						<Text modal>{strings('fiat_on_ramp.wyre_limits_us')}</Text>
						<Text>{strings('fiat_on_ramp.wyre_not_available')}</Text>
						<View style={styles.spacer} />
						<Text modal bold>
							{strings('fiat_on_ramp.wyre_fees_outside_us_title')}
						</Text>
						<Text modal>{strings('fiat_on_ramp.wyre_fees_outside_us')}</Text>
						<Text modal>{strings('fiat_on_ramp.wyre_limits_outside_us')}</Text>
						<View style={styles.spacer} />

						<Text modal bold>
							{strings('fiat_on_ramp.supported_countries_title')}
						</Text>
						<View style={styles.countryList}>
							<ScrollView contentContainerStyle={styles.countryList}>
								<View style={styles.countryCol}>
									<Text primary>Algeria 🇩🇿</Text>
								</View>
								<View style={styles.countryCol}>
									<Text primary>Japan 🇯🇵</Text>
								</View>
							</ScrollView>
						</View>

						<View style={styles.spacer} />
						<Text
							modal
							link
							// eslint-disable-next-line react/jsx-no-bind
							onPress={() => {
								hideModal();
								handleWyreTerms();
							}}
						>
							{strings('fiat_on_ramp.wyre_modal_terms_of_service_apply')}
						</Text>
					</PaymentMethod.Modal>
				</PaymentMethod.Details>
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
