import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';
import { useSendContext } from '../../../context/send-context/send-context';
import { RecipientInputMethod } from '../../../context/send-context/send-metrics-context';
import { useRecipientSelectionMetrics } from '../../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useAccounts } from '../../../hooks/send/useAccounts';
import { useContacts } from '../../../hooks/send/useContacts';
import { useRecipientPageReset } from '../../../hooks/send/useRecipientPageReset';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendActions } from '../../../hooks/send/useSendActions';
import { useToAddressValidation } from '../../../hooks/send/useToAddressValidation';
import { RecipientInput } from '../../recipient-input';
import { RecipientList } from '../../recipient-list/recipient-list';
import { RecipientType } from '../../UI/recipient';
import { styleSheet } from './recipient.styles';

export const Recipient = () => {
  const [isRecipientSelectedFromList, setIsRecipientSelectedFromList] =
    useState(false);
  const [pastedRecipient, setPastedRecipient] = useState<string>();
  const { to, updateTo, asset, chainId, submitError } = useSendContext();
  const { handleSubmitPress } = useSendActions();
  const accounts = useAccounts();
  const contacts = useContacts();
  const { captureRecipientSelected } = useRecipientSelectionMetrics();
  const styles = styleSheet();
  const {
    toAddressError,
    toAddressWarning,
    toAddressValidated,
    loading,
    resolvedAddress,
  } = useToAddressValidation();

  const isReviewButtonDisabled =
    Boolean(toAddressError) || Boolean(submitError);
  // This hook needs to be called to update ERC721 NFTs in send flow
  // because that flow is triggered directly from the asset details page and user is redirected to the recipient page
  useRouteParams();
  // This submission lifecycle state prevents adding multiple transactions
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  // Reset the submitting state when the user returns to the recipient page
  useFocusEffect(
    useCallback(() => {
      setIsSubmittingTransaction(false);
      setIsRecipientSelectedFromList(false);
    }, [setIsSubmittingTransaction, setIsRecipientSelectedFromList]),
  );

  const handleReview = useCallback(
    async (isPasted?: boolean) => {
      if (toAddressError || isSubmittingTransaction) {
        return;
      }
      // Precheck: only set `isSubmittingTransaction` guard if submission can proceed
      if (!asset || !chainId) {
        return;
      }
      setIsSubmittingTransaction(true);
      setPastedRecipient(undefined);
      captureRecipientSelected(
        isPasted ? RecipientInputMethod.Pasted : RecipientInputMethod.Manual,
      );
      await handleSubmitPress(resolvedAddress || to);
      setIsSubmittingTransaction(false);
    },
    [
      to,
      toAddressError,
      handleSubmitPress,
      captureRecipientSelected,
      resolvedAddress,
      setPastedRecipient,
      isSubmittingTransaction,
      asset,
      chainId,
    ],
  );

  useEffect(() => {
    if (
      pastedRecipient &&
      pastedRecipient === toAddressValidated &&
      !toAddressError &&
      !toAddressWarning &&
      !loading
    ) {
      handleReview(true);
    }
  }, [
    handleReview,
    pastedRecipient,
    toAddressError,
    toAddressValidated,
    toAddressWarning,
    loading,
  ]);

  const onRecipientSelected = useCallback(
    (
      recipientInputMethod:
        | typeof RecipientInputMethod.SelectAccount
        | typeof RecipientInputMethod.SelectContact,
    ) =>
      async (recipient: RecipientType) => {
        if (isSubmittingTransaction) {
          return;
        }
        // Precheck: only set `isSubmittingTransaction` guard if submission can proceed
        if (!asset || !chainId) {
          return;
        }
        setIsSubmittingTransaction(true);
        const selectedAddress = recipient.address;
        setIsRecipientSelectedFromList(true);
        updateTo(selectedAddress);
        captureRecipientSelected(recipientInputMethod);
        await handleSubmitPress(selectedAddress);
        setIsSubmittingTransaction(false);
      },
    [
      updateTo,
      handleSubmitPress,
      captureRecipientSelected,
      isSubmittingTransaction,
      asset,
      chainId,
    ],
  );

  const resetStateOnInput = useCallback(() => {
    setIsRecipientSelectedFromList(false);
    setIsSubmittingTransaction(false);
  }, [setIsRecipientSelectedFromList, setIsSubmittingTransaction]);

  const handleSubmitPressLocal = useCallback(() => {
    handleReview(false);
  }, [handleReview]);

  useRecipientPageReset(resetStateOnInput);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <Box twClassName="flex-1">
          <RecipientInput
            isRecipientSelectedFromList={isRecipientSelectedFromList}
            resetStateOnInput={resetStateOnInput}
            setPastedRecipient={setPastedRecipient}
          />
          <ScrollView>
            <RecipientList
              data={accounts}
              onRecipientSelected={onRecipientSelected(
                RecipientInputMethod.SelectAccount,
              )}
              disabled={isSubmittingTransaction}
            />
            {contacts.length > 0 && (
              <RecipientList
                isContactList
                data={contacts}
                onRecipientSelected={onRecipientSelected(
                  RecipientInputMethod.SelectContact,
                )}
                emptyMessage={strings('send.no_contacts_found')}
                disabled={isSubmittingTransaction}
              />
            )}
          </ScrollView>
          {(to || '').length > 0 && !isRecipientSelectedFromList && (
            <Box twClassName="px-4 py-4">
              {toAddressWarning && (
                <Banner
                  testID="to-address-warning-banner"
                  variant={BannerVariant.Alert}
                  severity={
                    // Confusable character validation is send both error and warning for invisible characters
                    // hence we are showing error for invisible characters
                    toAddressError && toAddressWarning
                      ? BannerAlertSeverity.Error
                      : BannerAlertSeverity.Warning
                  }
                  style={styles.banner}
                  title={toAddressWarning}
                />
              )}
              <Button
                testID="review-button"
                variant={ButtonVariant.Primary}
                size={ButtonBaseSize.Lg}
                onPress={handleSubmitPressLocal}
                twClassName="w-full"
                isDanger={
                  !loading && (Boolean(toAddressError) || Boolean(submitError))
                }
                disabled={
                  isReviewButtonDisabled || isSubmittingTransaction || loading
                }
                isLoading={isSubmittingTransaction || loading}
              >
                {isReviewButtonDisabled
                  ? (toAddressError ?? submitError)
                  : strings('send.review')}
              </Button>
            </Box>
          )}
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
