import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import Modal from 'react-native-modal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { swapsUtils } from '@metamask/swaps-controller';

import EditPermission from '../../ApproveTransactionReview/EditPermission';
import { fromTokenMinimalUnitString, hexToBN } from '../../../../util/number';
import {
  decodeApproveData,
  generateTxWithNewTokenAllowance,
} from '../../../../util/transactions';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';
import Logger from '../../../../util/Logger';

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
  const [approvalTransactionAmount, setApprovalTransactionAmount] =
    useState('');
  const [approvalCustomValue, setApprovalCustomValue] =
    useState(minimumSpendLimit);
  const [spendLimitUnlimitedSelected, setSpendLimitUnlimitedSelected] =
    useState(true);
  const { colors } = useAppThemeFromContext() || mockTheme;

  const onSpendLimitCustomValueChange = useCallback(
    (approvalCustomValue) => setApprovalCustomValue(approvalCustomValue),
    [],
  );
  const onPressSpendLimitUnlimitedSelected = useCallback(
    () => setSpendLimitUnlimitedSelected(true),
    [],
  );
  const onPressSpendLimitCustomSelected = useCallback(
    () => setSpendLimitUnlimitedSelected(false),
    [],
  );

  const onSetApprovalAmount = useCallback(() => {
    try {
      const newApprovalTransaction = generateTxWithNewTokenAllowance(
        spendLimitUnlimitedSelected
          ? approvalTransactionAmount
          : approvalCustomValue,
        sourceToken.decimals,
        swapsUtils.getSwapsContractAddress(chainId),
        approvalTransaction,
      );
      setApprovalTransaction(newApprovalTransaction);
      onCancelEditQuoteTransactions();
    } catch (err) {
      Logger.log('Failed to setTransactionObject', err);
    }
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
      const approvalTransactionAmount = decodeApproveData(
        originalApprovalTransaction.data,
      ).encodedAmount;
      const amountDec = hexToBN(approvalTransactionAmount).toString(10);
      setApprovalTransactionAmount(
        fromTokenMinimalUnitString(amountDec, sourceToken.decimals),
      );
    }
  }, [
    originalApprovalTransaction,
    sourceToken.decimals,
    setApprovalTransaction,
  ]);

  return (
    <Modal
      isVisible={editQuoteTransactionsVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={onCancelEditQuoteTransactions}
      onBackButtonPress={onCancelEditQuoteTransactions}
      onSwipeComplete={onCancelEditQuoteTransactions}
      swipeDirection={'down'}
      propagateSwipe
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.keyboardAwareWrapper}
      >
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
            onPressSpendLimitUnlimitedSelected={
              onPressSpendLimitUnlimitedSelected
            }
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
  originalApprovalTransaction:
    state.engine.backgroundState.SwapsController.approvalTransaction,
});

export default connect(mapStateToProps)(ApprovalTransactionEditionModal);
