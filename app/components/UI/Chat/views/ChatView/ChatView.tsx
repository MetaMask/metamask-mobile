import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import MarkdownText from '../../components/MarkdownText';
import { useAgentChat } from '../../hooks/useAgentChat';
import type { ChatMessage } from '../../types';

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  return (
    <Box
      twClassName={
        isUser
          ? 'my-1 max-w-[85%] self-end rounded-2xl bg-primary-default px-4 py-2'
          : 'my-1 max-w-[85%] self-start rounded-2xl bg-muted px-4 py-2'
      }
    >
      {message.toolCalls.map((toolCall) => (
        <Text
          key={toolCall.toolCallId}
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
        >
          {toolCall.status === 'running' ? '⏳ ' : '✓ '}
          {toolCall.toolName}
        </Text>
      ))}
      {isUser || message.text === '' ? (
        <Text
          variant={TextVariant.BodyMd}
          color={isUser ? TextColor.PrimaryInverse : TextColor.TextDefault}
        >
          {message.text === '' && message.status !== 'error'
            ? '…'
            : message.text}
        </Text>
      ) : (
        <MarkdownText color={TextColor.TextDefault}>
          {message.text}
        </MarkdownText>
      )}
    </Box>
  );
};

/**
 * Read-only chat with the wallet agent (agentic-harness backend).
 * Dev-only spike: registered behind METAMASK_ENVIRONMENT !== 'production',
 * reached from Settings.
 */
const ChatView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { messages, sendMessage, cancel, isRunning, error } = useAgentChat();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlashList<ChatMessage>>(null);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleSend = useCallback(() => {
    if (draft.trim() === '') return;
    sendMessage(draft);
    setDraft('');
  }, [draft, sendMessage]);

  const handlePrimaryAction = useCallback(() => {
    if (isRunning) {
      cancel();
      return;
    }
    handleSend();
  }, [cancel, handleSend, isRunning]);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    [],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-default`} edges={['top', 'bottom']}>
      <HeaderStandard
        title={strings('app_settings.agent_chat.title')}
        onBack={handleBack}
      />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlashList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`px-4 py-2`}
          onContentSizeChange={scrollToEnd}
        />
        {error === undefined ? null : (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="px-4 pb-1"
          >
            {error}
          </Text>
        )}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="border-t border-muted px-4 py-2"
        >
          <Box twClassName="flex-1">
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={strings('app_settings.agent_chat.placeholder')}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={handlePrimaryAction}
          >
            {isRunning
              ? strings('app_settings.agent_chat.stop')
              : strings('app_settings.agent_chat.send')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatView;
