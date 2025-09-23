import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
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
  const { to, updateTo, asset, chainId } = useSendContext();
  const { handleSubmitPress } = useSendActions();
  const accounts = useAccounts();
  const contacts = useContacts();
  const {
    captureRecipientSelected,
    setRecipientInputMethodSelectAccount,
    setRecipientInputMethodSelectContact,
  } = useRecipientSelectionMetrics();
  const styles = styleSheet();
  const {
    toAddressError,
    toAddressWarning,
    toAddressValidated,
    loading,
    resolvedAddress,
  } = useToAddressValidation();

  const isReviewButtonDisabled = Boolean(toAddressError);
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
      updateTo('');
    }, [updateTo]),
  );

  const handleReview = useCallback(async () => {
    if (toAddressError || isSubmittingTransaction) {
      return;
    }
    // Precheck: only set `isSubmittingTransaction` guard if submission can proceed
    if (!asset || !chainId) {
      return;
    }
    setIsSubmittingTransaction(true);
    setPastedRecipient(undefined);
    handleSubmitPress(resolvedAddress || to);
    captureRecipientSelected();
  }, [
    to,
    toAddressError,
    handleSubmitPress,
    captureRecipientSelected,
    resolvedAddress,
    setPastedRecipient,
    isSubmittingTransaction,
    asset,
    chainId,
  ]);

  useEffect(() => {
    if (
      pastedRecipient &&
      pastedRecipient === toAddressValidated &&
      !toAddressError &&
      !toAddressWarning &&
      !loading
    ) {
      handleReview();
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
        recipientType:
          | typeof RecipientInputMethod.SelectAccount
          | typeof RecipientInputMethod.SelectContact,
      ) =>
      (recipient: RecipientType) => {
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
        if (recipientType === RecipientInputMethod.SelectAccount) {
          setRecipientInputMethodSelectAccount();
        } else {
          setRecipientInputMethodSelectContact();
        }
        handleSubmitPress(selectedAddress);
        captureRecipientSelected();
      },
    [
      updateTo,
      handleSubmitPress,
      captureRecipientSelected,
      setRecipientInputMethodSelectAccount,
      setRecipientInputMethodSelectContact,
      isSubmittingTransaction,
      asset,
      chainId,
    ],
  );

  const resetStateOnInput = useCallback(() => {
    setIsRecipientSelectedFromList(false);
    setIsSubmittingTransaction(false);
  }, [setIsRecipientSelectedFromList, setIsSubmittingTransaction]);

  useRecipientPageReset(resetStateOnInput);

  return (
    <SafeAreaView style={styles.container}>
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
                testID="review-button-send"
                variant={ButtonVariant.Primary}
                size={ButtonBaseSize.Lg}
                onPress={handleReview}
                twClassName="w-full"
                isDanger={!loading && Boolean(toAddressError)}
                disabled={
                  Boolean(toAddressError) || isSubmittingTransaction || loading
                }
                isLoading={isSubmittingTransaction || loading}
              >
                {isReviewButtonDisabled
                  ? toAddressError
                  : strings('send.review')}
              </Button>
            </Box>
          )}
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
