import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import Modal from 'react-native-modal';
import { fromTokenMinimalUnitString, hexToBN, toTokenMinimalUnit } from '../../../../util/number';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import EditPermission from '../../ApproveTransactionReview/EditPermission';
import { decodeApproveData, generateApproveData } from '../../../../util/transactions';
import { swapsUtils } from '@metamask/swaps-controller';

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
});

function ApprovalTransactionEditionModal({
	originalApprovalTransaction,
	approvalTransaction,
	editQuoteTransactionsVisible,
	onCancelEditQuoteTransactions,
	setApprovalTransaction,
	sourceToken,
	minimumSpendLimit,
	chainId,
}) {
	/* Approval transaction if any */
	const [approvalTransactionAmount, setApprovalTransactionAmount] = useState('');
	const [approvalCustomValue, setApprovalCustomValue] = useState(minimumSpendLimit);
	const [spendLimitUnlimitedSelected, setSpendLimitUnlimitedSelected] = useState(true);

	const onSpendLimitCustomValueChange = useCallback(
		(approvalCustomValue) => setApprovalCustomValue(approvalCustomValue),
		[]
	);
	const onPressSpendLimitUnlimitedSelected = useCallback(() => setSpendLimitUnlimitedSelected(true), []);
	const onPressSpendLimitCustomSelected = useCallback(() => setSpendLimitUnlimitedSelected(false), []);

	const onSetApprovalAmount = useCallback(() => {
		const uint = toTokenMinimalUnit(
			spendLimitUnlimitedSelected ? approvalTransactionAmount : approvalCustomValue,
			sourceToken.decimals
		).toString(10);
		const approvalData = generateApproveData({
			spender: swapsUtils.getSwapsContractAddress(chainId),
			value: Number(uint).toString(16),
		});
		const newApprovalTransaction = { ...approvalTransaction, data: approvalData };
		setApprovalTransaction(newApprovalTransaction);
		onCancelEditQuoteTransactions();
	}, [
		setApprovalTransaction,
		spendLimitUnlimitedSelected,
		approvalTransactionAmount,
		approvalCustomValue,
		approvalTransaction,
		sourceToken,
		chainId,
		onCancelEditQuoteTransactions,
	]);

	useEffect(() => {
		setApprovalTransaction(originalApprovalTransaction);
		if (originalApprovalTransaction) {
			const approvalTransactionAmount = decodeApproveData(originalApprovalTransaction.data).encodedAmount;
			const amountDec = hexToBN(approvalTransactionAmount).toString(10);
			setApprovalTransactionAmount(fromTokenMinimalUnitString(amountDec, sourceToken.decimals));
		}
	}, [originalApprovalTransaction, sourceToken.decimals, setApprovalTransaction]);

	return (
		<Modal
			isVisible={editQuoteTransactionsVisible}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={onCancelEditQuoteTransactions}
			onBackButtonPress={onCancelEditQuoteTransactions}
			onSwipeComplete={onCancelEditQuoteTransactions}
			swipeDirection={'down'}
			propagateSwipe
		>
			<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
				{Boolean(approvalTransaction) && (
					<EditPermission
						host={'Swaps'}
						minimumSpendLimit={minimumSpendLimit}
						spendLimitUnlimitedSelected={spendLimitUnlimitedSelected}
						tokenSymbol={sourceToken.symbol}
						spendLimitCustomValue={approvalCustomValue}
						originalApproveAmount={approvalTransactionAmount}
						onSetApprovalAmount={onSetApprovalAmount}
						onSpendLimitCustomValueChange={onSpendLimitCustomValueChange}
						onPressSpendLimitUnlimitedSelected={onPressSpendLimitUnlimitedSelected}
						onPressSpendLimitCustomSelected={onPressSpendLimitCustomSelected}
						toggleEditPermission={onCancelEditQuoteTransactions}
					/>
				)}
			</KeyboardAwareScrollView>
		</Modal>
	);
}

ApprovalTransactionEditionModal.propTypes = {
	approvalTransaction: PropTypes.object,
	originalApprovalTransaction: PropTypes.object,
	editQuoteTransactionsVisible: PropTypes.bool,
	minimumSpendLimit: PropTypes.string.isRequired,
	onCancelEditQuoteTransactions: PropTypes.func,
	setApprovalTransaction: PropTypes.func,
	sourceToken: PropTypes.object,
	chainId: PropTypes.string,
};

const mapStateToProps = (state) => ({
	originalApprovalTransaction: state.engine.backgroundState.SwapsController.approvalTransaction,
});

export default connect(mapStateToProps)(ApprovalTransactionEditionModal);
