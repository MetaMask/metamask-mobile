import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, SafeAreaView, View, ScrollView } from 'react-native';
import Modal from 'react-native-modal';

import ScreenLayout from './ScreenLayout';
import ModalDragger from '../../../Base/ModalDragger';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import PaymentOption from './PaymentOption';
import { PAYMENT_METHOD_ICON } from '../constants';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
	StyleSheet.create({
		modal: {
			margin: 0,
			justifyContent: 'flex-end',
		},
		modalView: {
			backgroundColor: colors.background.default,
			borderTopLeftRadius: 10,
			borderTopRightRadius: 10,
			flex: 0.75,
		},
		resultsView: {
			marginTop: 0,
			flex: 1,
		},
		content: {
			paddingTop: 0,
		},
		row: {
			marginVertical: 8,
		},
	});

function PaymentMethodModal({ isVisible, dismiss, title }) {
	const { colors } = useTheme();
	const styles = createStyles(colors);
	const { selectedCountry, selectedRegion, selectedPaymentMethod, setSelectedPaymentMethod } = useFiatOnRampSDK();
	const [{ data: paymentMethods }] = useSDKMethod('getPaymentMethods', {
		countryId: selectedCountry?.id,
		regionId: selectedRegion?.id,
	});

	const handleOnPressItemCallback = useCallback(
		(paymentMethodId) => {
			setSelectedPaymentMethod(paymentMethodId);
			dismiss();
		},
		[dismiss, setSelectedPaymentMethod]
	);

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={dismiss}
			onBackButtonPress={dismiss}
			onSwipeComplete={dismiss}
			swipeDirection="down"
			propagateSwipe
			avoidKeyboard
			backdropColor={colors.overlay.default}
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<ModalDragger />
				<ScreenLayout>
					<ScreenLayout.Header bold title={title}></ScreenLayout.Header>

					<ScreenLayout.Body>
						<ScrollView>
							<View style={styles.resultsView}>
								<ScreenLayout.Content style={styles.content}>
									{paymentMethods?.map(({ id, name, delay, amountTier }) => (
										<View key={id} style={styles.row}>
											<PaymentOption
												highlighted={id === selectedPaymentMethod}
												title={name}
												time={delay}
												cardImage={[
													'/payments/apple-pay',
													'/payments/debit-credit-card',
												].includes(id)}
												onPress={() => handleOnPressItemCallback(id)}
												amountTier={amountTier}
												paymentType={PAYMENT_METHOD_ICON[id]}
												idRequired={false}
											/>
										</View>
									))}
								</ScreenLayout.Content>
							</View>
						</ScrollView>
					</ScreenLayout.Body>
				</ScreenLayout>
			</SafeAreaView>
		</Modal>
	);
}

PaymentMethodModal.propTypes = {
	isVisible: PropTypes.bool,
	dismiss: PropTypes.func,
	title: PropTypes.string,
};

export default PaymentMethodModal;
