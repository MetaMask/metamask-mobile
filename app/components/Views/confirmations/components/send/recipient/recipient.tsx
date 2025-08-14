import React, { useCallback, useState, useRef, useMemo } from 'react';
import { Platform, TextInput, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { Box, Text, Button, ButtonVariant, ButtonBaseSize } from '@metamask/design-system-react-native';

import Routes from '../../../../../../constants/navigation/Routes';
import TabBar from '../../../../../../component-library/components-temp/TabBar/TabBar';
import TextField from '../../../../../../component-library/components/Form/TextField';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import ClipboardManager from '../../../../../../core/ClipboardManager';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { useWallets } from '../../../hooks/send/useWallets';
import { RecipientList } from '../../recipient-list';

export const Recipient = () => {
  const [addressInput, setAddressInput] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const wallets = useWallets();
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
    console.log('Review address:', addressInput);
  }, [addressInput]);

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
        onPress={handlePaste}
      >
        Paste
      </Button>
    );
  }, [addressInput.length, handleClearInput, handlePaste]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
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
                  <RecipientList wallets={wallets} />
                </Box>
                <Box key="contacts" {...{ tabLabel: 'Contacts' }} twClassName="flex-1">
                  <Text>
                    Contacts - will be implemented in separate PR - Intentional empty
                  </Text>
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