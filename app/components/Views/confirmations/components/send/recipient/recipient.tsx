import React, { useCallback, useState } from 'react';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { Platform, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import TabBar from '../../../../../../component-library/components-temp/TabBar/TabBar';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
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
  const [addressInput, setAddressInput] = useState('');
  const { updateTo } = useSendContext();
  const { handleSubmitPress } = useSendActions();
  const accounts = useAccounts();
  const contacts = useContacts();
  const { captureRecipientSelected, setRecipientInputMethod } =
    useRecipientSelectionMetrics();
  const styles = styleSheet();
  useSendNavbar({ currentRoute: Routes.SEND.RECIPIENT });
  const { toAddressError } = useToAddressValidation(addressInput);

  const handleReview = useCallback(() => {
    if (toAddressError) {
      return;
    }
    updateTo(addressInput);
    handleSubmitPress(addressInput);
    setRecipientInputMethod(RecipientInputMethod.Manual);
    captureRecipientSelected();
  }, [
    addressInput,
    toAddressError,
    updateTo,
    handleSubmitPress,
    captureRecipientSelected,
    setRecipientInputMethod,
  ]);

  const onRecipientSelected = useCallback(
    (
        recipientType:
          | typeof RecipientInputMethod.SelectAccount
          | typeof RecipientInputMethod.SelectContact,
      ) =>
      (recipient: RecipientType) => {
        const to = recipient.address;
        updateTo(to);
        setRecipientInputMethod(recipientType);
        captureRecipientSelected();
        handleSubmitPress(to);
      },
    [
      updateTo,
      handleSubmitPress,
      captureRecipientSelected,
      setRecipientInputMethod,
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
          <RecipientInput value={addressInput} onChangeText={setAddressInput} />
          <Box twClassName="flex-1">
            {addressInput.length === 0 && (
              <ScrollableTabView renderTabBar={() => <TabBar />}>
                <Box
                  key="your-accounts"
                  {...{ tabLabel: strings('send.accounts') }}
                  twClassName="flex-1"
                >
                  <RecipientList
                    data={accounts}
                    onRecipientSelected={onRecipientSelected(
                      RecipientInputMethod.SelectAccount,
                    )}
                  />
                </Box>
                <Box
                  key="contacts"
                  {...{ tabLabel: strings('send.contacts') }}
                  twClassName="flex-1"
                >
                  <RecipientList
                    data={contacts}
                    onRecipientSelected={onRecipientSelected(
                      RecipientInputMethod.SelectContact,
                    )}
                    emptyMessage={strings('send.no_contacts_found')}
                  />
                </Box>
              </ScrollableTabView>
            )}
          </Box>
          {addressInput.length > 0 && (
            <Box twClassName="px-4 py-4">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonBaseSize.Lg}
                onPress={handleReview}
                twClassName="w-full"
                isDanger={Boolean(toAddressError)}
                disabled={Boolean(toAddressError)}
              >
                {strings('send.review')}
              </Button>
            </Box>
          )}
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
