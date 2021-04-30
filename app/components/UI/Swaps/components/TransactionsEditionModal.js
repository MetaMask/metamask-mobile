import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import Modal from 'react-native-modal';
import { fromTokenMinimalUnitString, hexToBN, toTokenMinimalUnit } from '../../../../util/number';
import CustomGas from '../../CustomGas';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import EditPermission from '../../ApproveTransactionReview/EditPermission';
import { decodeApproveData, generateApproveData } from '../../../../util/transactions';
import { swapsUtils } from '@metamask/swaps-controller';
import AnimatedTransactionModal from '../../AnimatedTransactionModal';

const EDIT_MODE_GAS = 'EDIT_MODE_GAS';
const EDIT_MODE_APPROVE_AMOUNT = 'EDIT_MODE_APPROVE_AMOUNT';

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

function TransactionsEditionModal({
	apiGasPrice,
	approvalTransaction: originalApprovalTransaction,
	editQuoteTransactionsMode,
	editQuoteTransactionsVisible,
	gasLimit,
	gasPrice,
	onCancelEditQuoteTransactions,
	onHandleGasFeeSelection,
	setApprovalTransaction,
	selectedQuote,
	sourceToken,
	minimumSpendLimit,
	minimumGasLimit,
	chainId
}) {
	/* Approval transaction if any */
	const [approvalTransactionAmount, setApprovalTransactionAmount] = useState(null);
	const [approvalCustomValue, setApprovalCustomValue] = useState(minimumSpendLimit);
	const [spendLimitUnlimitedSelected, setSpendLimitUnlimitedSelected] = useState(true);
	const [approvalTransaction] = useState(originalApprovalTransaction);
	const [currentGasSelector, setCurrentGasSelector] = useState(null);

	const onSpendLimitCustomValueChange = useCallback(
		approvalCustomValue => setApprovalCustomValue(approvalCustomValue),
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
			value: Number(uint).toString(16)
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
		onCancelEditQuoteTransactions
	]);

	const onPressGasSelector = useCallback(gasSelector => {
		setCurrentGasSelector(gasSelector);
	}, []);

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
				{editQuoteTransactionsMode === EDIT_MODE_APPROVE_AMOUNT && !!approvalTransaction && (
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
				{editQuoteTransactionsMode === EDIT_MODE_GAS && (
					<AnimatedTransactionModal onModeChange={onCancelEditQuoteTransactions} ready review={() => null}>
						<CustomGas
							gasSpeedSelected={currentGasSelector}
							onPress={onPressGasSelector}
							handleGasFeeSelection={onHandleGasFeeSelection}
							basicGasEstimates={apiGasPrice}
							gas={hexToBN(gasLimit)}
							gasPrice={hexToBN(gasPrice)}
							minimumGasPrice={hexToBN(gasPrice)}
							minimumGasLimit={minimumGasLimit}
							gasError={null}
							mode={'edit'}
							customTransaction={selectedQuote.trade}
							hideSlow
							view={'Swaps'}
						/>
					</AnimatedTransactionModal>
				)}
			</KeyboardAwareScrollView>
		</Modal>
	);
}

TransactionsEditionModal.propTypes = {
	apiGasPrice: PropTypes.object,
	approvalTransaction: PropTypes.object,
	editQuoteTransactionsMode: PropTypes.string,
	editQuoteTransactionsVisible: PropTypes.bool,
	gasLimit: PropTypes.string,
	gasPrice: PropTypes.string,
	minimumSpendLimit: PropTypes.string.isRequired,
	minimumGasLimit: PropTypes.string,
	onCancelEditQuoteTransactions: PropTypes.func,
	onHandleGasFeeSelection: PropTypes.func,
	setApprovalTransaction: PropTypes.func,
	selectedQuote: PropTypes.object,
	sourceToken: PropTypes.object,
	chainId: PropTypes.string
};

const mapStateToProps = state => ({
	approvalTransaction: state.engine.backgroundState.SwapsController.approvalTransaction
});

export default connect(mapStateToProps)(TransactionsEditionModal);
