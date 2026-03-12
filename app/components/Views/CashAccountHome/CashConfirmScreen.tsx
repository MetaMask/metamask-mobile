/**
 * Thin wrapper around the shared Confirm screen for the Cash Account deposit flow.
 *
 * The standard Confirm component shows a loading skeleton when there is no
 * pending approvalRequest (e.g. while the batch is being created, or after the
 * user cancels). For the Cash stack we want to pop back to CashAccountHome in
 * both of those cases, so we:
 *  1. Navigate back when approvalRequest drops to null after having been set
 *     (user cancelled or an error occurred).
 *  2. Reject + navigate back when the screen regains focus but no approvalRequest
 *     exists (e.g. the user swiped back via the iOS gesture without rejecting,
 *     leaving a stale unapproved batch in Redux).
 */
import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../core/Engine';
import useApprovalRequest from '../confirmations/hooks/useApprovalRequest';
import { Confirm } from '../confirmations/components/confirm';

const CashConfirmScreen = () => {
  const navigation = useNavigation();
  const { approvalRequest } = useApprovalRequest();
  const hadApproval = useRef(false);

  // Track whether we've ever seen a live approval on this mount.
  useEffect(() => {
    if (approvalRequest) {
      hadApproval.current = true;
    }
  }, [approvalRequest]);

  // Once we've seen an approval, navigate back as soon as it disappears
  // (user cancelled, tx was rejected, or an error cleared it).
  useEffect(() => {
    if (hadApproval.current && !approvalRequest) {
      navigation.goBack();
    }
  }, [approvalRequest, navigation]);

  // If the screen regains focus while there is no approval (e.g. user swiped
  // back via iOS gesture without tapping Cancel), reject any lingering batch
  // and return to CashAccountHome.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!approvalRequest) return;

      // Only handle wallet-initiated transaction approvals.
      if (
        approvalRequest.type !== 'transaction_batch' &&
        approvalRequest.type !== 'transaction'
      )
        return;

      try {
        Engine.context.ApprovalController.reject(
          approvalRequest.id,
          providerErrors.userRejectedRequest(),
        );
      } catch {
        // Already resolved — ignore.
      }
      navigation.goBack();
    });

    return unsubscribe;
  }, [approvalRequest, navigation]);

  return <Confirm />;
};

export default CashConfirmScreen;
