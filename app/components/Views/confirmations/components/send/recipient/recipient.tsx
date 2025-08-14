import React, { useCallback, useState, useRef, useMemo } from 'react';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import {
  Platform,
  TextInput,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  TextColor,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../../constants/navigation/Routes';
import TabBar from '../../../../../../component-library/components-temp/TabBar/TabBar';
import TextField from '../../../../../../component-library/components/Form/TextField';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import ClipboardManager from '../../../../../../core/ClipboardManager';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { AccountList } from '../../account-list';
import { ContactList } from '../../contact-list';
import { styleSheet } from './recipient.styles';

export const Recipient = () => {
  const [addressInput, setAddressInput] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const styles = styleSheet();
  useSendNavbar({ currentRoute: Routes.SEND.RECIPIENT });

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await ClipboardManager.getString();
      if (clipboardText) {
        setAddressInput(clipboardText.trim());
        // Keep focus after pasting
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, []);

  const handleReview = useCallback(() => {
    // console.log('Review address:', addressInput);
  }, []);

  const handleClearInput = useCallback(() => {
    setAddressInput('');
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, []);

  const renderEndAccessory = useMemo(() => {
    if (addressInput.length > 0) {
      return (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          twClassName="-mr-2"
          onPress={handleClearInput}
        >
          Clear
        </Button>
      );
    }
    return (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonBaseSize.Sm}
        twClassName="-mr-2"
        onPress={handlePaste}
      >
        Paste
      </Button>
    );
  }, [addressInput.length, handleClearInput, handlePaste]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <Box twClassName="flex-1">
          <Box twClassName="w-full px-4 py-2">
            <TextField
              autoCorrect={false}
              ref={textInputRef}
              value={addressInput}
              onChangeText={setAddressInput}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              placeholder="Enter address to send to"
              size={TextFieldSize.Lg}
              endAccessory={renderEndAccessory}
              startAccessory={<Text color={TextColor.TextAlternative}>To</Text>}
              autoFocus={false}
            />
          </Box>

          <Box twClassName="flex-1">
            {addressInput.length === 0 && (
              <ScrollableTabView renderTabBar={() => <TabBar />}>
                <Box
                  key="your-accounts"
                  {...{ tabLabel: 'Accounts' }}
                  twClassName="flex-1"
                >
                  <AccountList />
                </Box>
                <Box
                  key="contacts"
                  {...{ tabLabel: 'Contacts' }}
                  twClassName="flex-1"
                >
                  <ContactList />
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
              >
                Review
              </Button>
            </Box>
          )}
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
