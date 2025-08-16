import React, { useCallback, useState } from 'react';
import { Platform, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  FontWeight,
  TextColor,
  TextVariant,
  Text,
} from '@metamask/design-system-react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { strings } from '../../../../../../../locales/i18n';
import { useSendContext } from '../../../context/send-context/send-context';
import { useAccounts } from '../../../hooks/send/useAccounts';
import { useContacts } from '../../../hooks/send/useContacts';
import { useToAddressValidation } from '../../../hooks/send/useToAddressValidation';
import { useRecipientSelectionMetrics } from '../../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useSendActions } from '../../../hooks/send/useSendActions';
import { RecipientInputMethod } from '../../../context/send-context/send-metrics-context';
import { RecipientList } from '../../recipient-list/recipient-list';
import { RecipientInput } from '../../recipient-input';
import { RecipientType } from '../../UI/recipient';
import { styleSheet } from './recipient.styles';

export const Recipient = () => {
  const [isRecipientSelectedFromList, setIsRecipientSelectedFromList] =
    useState(false);
  const { to, updateTo } = useSendContext();
  const { handleSubmitPress } = useSendActions();
  const accounts = useAccounts();
  const contacts = useContacts();
  const {
    captureRecipientSelected,
    setRecipientInputMethodManual,
    setRecipientInputMethodSelectAccount,
    setRecipientInputMethodSelectContact,
  } = useRecipientSelectionMetrics();
  const styles = styleSheet();
  const { toAddressError } = useToAddressValidation();
  const isReviewButtonDisabled = Boolean(toAddressError);

  const handleReview = useCallback(() => {
    if (toAddressError) {
      return;
    }
    handleSubmitPress(to);
    setRecipientInputMethodManual();
    captureRecipientSelected();
  }, [
    to,
    toAddressError,
    handleSubmitPress,
    captureRecipientSelected,
    setRecipientInputMethodManual,
  ]);

  const onRecipientSelected = useCallback(
    (
        recipientType:
          | typeof RecipientInputMethod.SelectAccount
          | typeof RecipientInputMethod.SelectContact,
      ) =>
      (recipient: RecipientType) => {
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
    ],
  );

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
          />
          <ScrollView>
            <Text
              twClassName="m-4"
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
            >
              {strings('send.accounts')}
            </Text>
            <RecipientList
              data={accounts}
              onRecipientSelected={onRecipientSelected(
                RecipientInputMethod.SelectAccount,
              )}
            />
            <Text
              twClassName="m-4"
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
            >
              {strings('send.contacts')}
            </Text>
            <RecipientList
              data={contacts}
              onRecipientSelected={onRecipientSelected(
                RecipientInputMethod.SelectContact,
              )}
              emptyMessage={strings('send.no_contacts_found')}
            />
          </ScrollView>
          {(to || '').length > 0 && !isRecipientSelectedFromList && (
            <Box twClassName="px-4 py-4">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonBaseSize.Lg}
                onPress={handleReview}
                twClassName="w-full"
                isDanger={Boolean(toAddressError)}
                disabled={Boolean(toAddressError)}
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
