import React, { useCallback, useEffect } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { WebSocketConnectionState } from '@metamask/perps-controller';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import PerpsWebSocketHealthToast from './PerpsWebSocketHealthToast';
import {
  WebSocketHealthToastProvider,
  useWebSocketHealthToastContext,
} from './PerpsWebSocketHealthToast.context';

interface WebSocketHealthToastTrigger {
  label: string;
  connectionState: WebSocketConnectionState;
  reconnectionAttempt?: number;
}

const WEBSOCKET_HEALTH_TOAST_TRIGGERS: WebSocketHealthToastTrigger[] = [
  {
    label: 'Disconnected',
    connectionState: WebSocketConnectionState.Disconnected,
  },
  {
    label: 'Connecting (attempt 1)',
    connectionState: WebSocketConnectionState.Connecting,
    reconnectionAttempt: 1,
  },
  {
    label: 'Connecting (attempt 3)',
    connectionState: WebSocketConnectionState.Connecting,
    reconnectionAttempt: 3,
  },
  {
    label: 'Connected',
    connectionState: WebSocketConnectionState.Connected,
  },
];

const StoryContainer = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('relative min-h-full w-full flex-1 bg-default')}>
      {children}
    </View>
  );
};

const PerpsWebSocketHealthToastStoryContent = () => {
  const tw = useTailwind();
  const { show, hide, setOnRetry } = useWebSocketHealthToastContext();

  useEffect(() => {
    setOnRetry(() => {
      Alert.alert('Storybook', 'Retry pressed');
    });
  }, [setOnRetry]);

  const triggerToast = useCallback(
    (trigger: WebSocketHealthToastTrigger) => {
      show(trigger.connectionState, trigger.reconnectionAttempt ?? 0);
    },
    [show],
  );

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tw.style('gap-2')}>
          <Text variant={TextVariant.HeadingSm}>Connection states</Text>
          {WEBSOCKET_HEALTH_TOAST_TRIGGERS.map((trigger) => (
            <Button
              key={trigger.label}
              variant={ButtonVariants.Secondary}
              label={trigger.label}
              onPress={() => triggerToast(trigger)}
            />
          ))}
          <Button
            variant={ButtonVariants.Secondary}
            label="Hide"
            onPress={() => hide()}
          />
        </View>
      </ScrollView>
      <PerpsWebSocketHealthToast />
    </StoryContainer>
  );
};

const PerpsWebSocketHealthToastStory = () => (
  <WebSocketHealthToastProvider>
    <PerpsWebSocketHealthToastStoryContent />
  </WebSocketHealthToastProvider>
);

const PerpsWebSocketHealthToastMeta = {
  title: 'Components / UI / Perps / PerpsWebSocketHealthToast',
  component: PerpsWebSocketHealthToast,
};

export default PerpsWebSocketHealthToastMeta;

export const Default = {
  render: () => <PerpsWebSocketHealthToastStory />,
};
