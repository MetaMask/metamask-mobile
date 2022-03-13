import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import Modal from 'react-native-modal';
import { colors } from '../../../../styles/common';
import ScreenLayout from './ScreenLayout';
import ModalDragger from '../../../Base/ModalDragger';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import PaymentOption from './PaymentOption';
import { PAYMENT_METHOD_ICON } from '../constants';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalView: {
		backgroundColor: colors.white,
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
			// onModalHide={() => {}}
			style={styles.modal}
		>
			<SafeAreaView style={styles.modalView}>
				<ModalDragger />
				<ScreenLayout>
					<ScreenLayout.Header bold title={title}></ScreenLayout.Header>

					<ScreenLayout.Body>
						<View style={styles.resultsView}>
							<ScreenLayout.Content style={styles.content}>
								{paymentMethods?.map(({ id, name, delay }) => (
									<View key={id} style={styles.row}>
										<PaymentOption
											highlighted={id === selectedPaymentMethod}
											title={name}
											time={delay}
											cardImage={['/payments/apple-pay', '/payments/debit-credit-card'].includes(
												id
											)}
											onPress={() => handleOnPressItemCallback(id)}
											lowestLimit
											paymentType={PAYMENT_METHOD_ICON[id]}
											idRequired={false}
										/>
									</View>
								))}
							</ScreenLayout.Content>
						</View>
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
