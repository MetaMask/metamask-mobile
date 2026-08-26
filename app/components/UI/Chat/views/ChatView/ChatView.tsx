import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconName,
  Spinner,
  TextField,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import MarkdownText from '../../components/MarkdownText';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useToolLabels, type ToolLabelMap } from '../../hooks/useToolLabels';
import type { ChatMessage } from '../../types';

/**
 * Real progress labels derived from tool-call chunks — the label reflects
 * what the agent is actually doing (unlike timer-driven progress theater).
 */
// Labels come from the backend registry (GET /chat/tools) via useToolLabels,
// with a shipped fallback — new backend tools get labels without an app
// release. Keys are the agent's tool-registry keys (camelCase).
const progressLabel = (message: ChatMessage, labels: ToolLabelMap): string => {
  const running = [...message.toolCalls]
    .reverse()
    .find((toolCall) => toolCall.status === 'running');
  if (running === undefined) {
    return strings('app_settings.agent_chat.thinking');
  }
  return labels[running.toolName]?.running ?? running.toolName;
};

const doneLabel = (toolName: string, labels: ToolLabelMap): string =>
  labels[toolName]?.done ?? toolName;

const SUGGESTION_KEYS = ['chip_wallet', 'chip_price', 'chip_activity'] as const;

const UserBubble = ({ message }: { message: ChatMessage }) => (
  <Box twClassName="my-2 max-w-[82%] self-end rounded-2xl bg-primary-default px-4 py-3">
    <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryInverse}>
      {message.text}
    </Text>
  </Box>
);

const AssistantMessage = ({
  message,
  labels,
  copied,
  onCopy,
  onRetry,
}: {
  message: ChatMessage;
  labels: ToolLabelMap;
  copied: boolean;
  onCopy: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
}) => {
  const showProgress =
    message.text === '' &&
    (message.status === 'pending' || message.status === 'streaming');
  return (
    <Box twClassName="my-2 w-full">
      {message.toolCalls
        .filter((toolCall) => toolCall.status !== 'running')
        .map((toolCall) => (
          <Text
            key={toolCall.toolCallId}
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
          >
            {'✓ '}
            {doneLabel(toolCall.toolName, labels)}
          </Text>
        ))}
      {showProgress ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="py-1"
          accessibilityRole="progressbar"
        >
          <Spinner />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {progressLabel(message, labels)}
          </Text>
        </Box>
      ) : (
        <MarkdownText color={TextColor.TextDefault}>
          {message.text}
        </MarkdownText>
      )}
      {message.status === 'done' && message.text !== '' && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="mt-1"
        >
          <ButtonIcon
            iconName={copied ? IconName.CopySuccess : IconName.Copy}
            size={ButtonIconSize.Md}
            onPress={() => onCopy(message)}
            accessibilityLabel={strings('app_settings.agent_chat.copy')}
          />
          <ButtonIcon
            iconName={IconName.Refresh}
            size={ButtonIconSize.Md}
            onPress={() => onRetry(message)}
            accessibilityLabel={strings('app_settings.agent_chat.retry')}
          />
          {copied ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.SuccessDefault}
              accessibilityLiveRegion="polite"
            >
              {strings('app_settings.agent_chat.copied')}
            </Text>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

/**
 * Read-only chat with the wallet agent (agentic-harness backend).
 * Dev-only spike: registered behind METAMASK_ENVIRONMENT !== 'production'.
 * Layout follows the PR #33923 design language: landing suggestions that
 * fill the composer, user-only bubbles, question-pins-to-top scrolling,
 * per-response actions, and a persistent non-advice footnote.
 */
const ChatView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { height: windowHeight } = useWindowDimensions();
  const { messages, sendMessage, cancel, newConversation, isRunning, error } =
    useAgentChat();
  const toolLabels = useToolLabels();
  const [draft, setDraft] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlashList<ChatMessage>>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) clearTimeout(copiedTimer.current);
    },
    [],
  );

  // Pin the newest question near the top while the answer streams in.
  useEffect(() => {
    if (!isRunning) return;
    const lastUserIndex = messages
      .map((message) => message.role)
      .lastIndexOf('user');
    if (lastUserIndex < 0) return;
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({
          index: lastUserIndex,
          animated: true,
          viewPosition: 0,
          viewOffset: 8,
        });
      } catch {
        // FlashList may not have measured yet — safe to skip.
      }
    });
  }, [messages, isRunning]);

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

  const handleCopy = useCallback((message: ChatMessage) => {
    Clipboard.setString(message.text);
    setCopiedId(message.id);
    if (copiedTimer.current !== null) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedId(null), 1500);
  }, []);

  // Refill the composer with the prompt that produced this answer.
  const handleRetry = useCallback(
    (message: ChatMessage) => {
      const index = messages.findIndex((entry) => entry.id === message.id);
      for (let i = index - 1; i >= 0; i -= 1) {
        const candidate = messages[i];
        if (candidate.role === 'user') {
          setDraft(candidate.text);
          return;
        }
      }
    },
    [messages],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) =>
      item.role === 'user' ? (
        <UserBubble message={item} />
      ) : (
        <AssistantMessage
          message={item}
          labels={toolLabels}
          copied={copiedId === item.id}
          onCopy={handleCopy}
          onRetry={handleRetry}
        />
      ),
    [copiedId, handleCopy, handleRetry, toolLabels],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-default`} edges={['top', 'bottom']}>
      <HeaderStandard
        title={strings('app_settings.agent_chat.title')}
        onBack={handleBack}
        endAccessory={
          messages.length > 0 ? (
            <ButtonIcon
              iconName={IconName.Add}
              size={ButtonIconSize.Md}
              onPress={newConversation}
              accessibilityLabel={strings(
                'app_settings.agent_chat.new_conversation',
              )}
            />
          ) : undefined
        }
      />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <Box twClassName="flex-1 justify-center px-6" gap={3}>
            <Text variant={TextVariant.HeadingMd} twClassName="mb-2">
              {strings('app_settings.agent_chat.landing_title')}
            </Text>
            {SUGGESTION_KEYS.map((key) => (
              <Button
                key={key}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="rounded-full self-start"
                onPress={() =>
                  setDraft(strings(`app_settings.agent_chat.${key}`))
                }
              >
                {strings(`app_settings.agent_chat.${key}`)}
              </Button>
            ))}
          </Box>
        ) : (
          <FlashList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw`px-4 py-2`}
            ListFooterComponent={
              isRunning ? (
                // Room below the streaming answer so the pinned question
                // has somewhere to scroll to.
                <Box style={{ height: windowHeight * 0.45 }} />
              ) : null
            }
          />
        )}
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
          twClassName="px-4 pt-2"
        >
          <Box twClassName="flex-1">
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder={strings('app_settings.agent_chat.placeholder')}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              twClassName="rounded-full"
            />
          </Box>
          <ButtonIcon
            iconName={isRunning ? IconName.Close : IconName.Arrow2Up}
            size={ButtonIconSize.Md}
            onPress={handlePrimaryAction}
            accessibilityLabel={strings(
              isRunning
                ? 'app_settings.agent_chat.stop'
                : 'app_settings.agent_chat.send',
            )}
          />
        </Box>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="px-4 py-1 text-center"
        >
          {strings('app_settings.agent_chat.disclaimer')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatView;
