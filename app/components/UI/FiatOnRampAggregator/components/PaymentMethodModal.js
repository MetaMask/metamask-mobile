import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, SafeAreaView, View, ScrollView } from 'react-native';
import Modal from 'react-native-modal';

import ScreenLayout from './ScreenLayout';
import ModalDragger from '../../../Base/ModalDragger';
import PaymentOption from './PaymentOption';

import { useTheme } from '../../../../util/theme';
import { getPaymentMethodIcon } from '../utils';

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

function PaymentMethodModal({ isVisible, dismiss, title, onItemPress, paymentMethods, selectedPaymentMethod }) {
	const { colors } = useTheme();
	const styles = createStyles(colors);

	const handleOnPressItemCallback = useCallback(
		(paymentMethodId) => {
			if (selectedPaymentMethod !== paymentMethodId) {
				onItemPress(paymentMethodId);
			} else {
				onItemPress();
			}
		},
		[onItemPress, selectedPaymentMethod]
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
												paymentType={getPaymentMethodIcon(id)}
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
	onItemPress: PropTypes.func,
	paymentMethods: PropTypes.array,
	selectedPaymentMethod: PropTypes.string,
};

export default PaymentMethodModal;
