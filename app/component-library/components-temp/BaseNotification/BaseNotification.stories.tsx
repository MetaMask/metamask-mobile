/* eslint-disable no-console */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Button, { ButtonVariants } from '../../components/Buttons/Button';
import BaseNotification from './index';
import type {
  BaseNotificationData,
  BaseNotificationProps,
  BaseNotificationStatus,
} from './BaseNotification.types';

interface NotificationTrigger {
  label: string;
  status: BaseNotificationStatus;
  data?: BaseNotificationData;
  autoDismiss?: boolean;
  onHide?: () => void;
}

interface ActiveNotification extends NotificationTrigger {
  key: number;
}

interface NotificationTriggerSection {
  title: string;
  triggers: NotificationTrigger[];
}

const STORYBOOK_PROPS: Pick<
  BaseNotificationProps,
  'persistUntilDismiss' | 'isVisible'
> = {
  isVisible: true,
  persistUntilDismiss: true,
};

const LOADING_TRIGGERS: NotificationTrigger[] = [
  { label: 'Pending', status: 'pending' },
  { label: 'Pending deposit', status: 'pending_deposit' },
  { label: 'Pending withdrawal', status: 'pending_withdrawal' },
  {
    label: 'Speedup',
    status: 'speedup',
    data: { nonce: '12' },
  },
];

const SUCCESS_TRIGGERS: NotificationTrigger[] = [
  {
    label: 'Success',
    status: 'success',
    data: { nonce: '42' },
  },
  { label: 'Success deposit', status: 'success_deposit' },
  { label: 'Success withdrawal', status: 'success_withdrawal' },
  {
    label: 'Received',
    status: 'received',
    data: { amount: '0.5', assetType: 'ETH' },
  },
  { label: 'Received payment', status: 'received_payment' },
  { label: 'ETH received', status: 'eth_received' },
  { label: 'Import success', status: 'import_success' },
  { label: 'Simple notification', status: 'simple_notification' },
];

const FAILURE_TRIGGERS: NotificationTrigger[] = [
  { label: 'Error', status: 'error' },
  { label: 'Cancelled', status: 'cancelled' },
  {
    label: 'Simple notification rejected',
    status: 'simple_notification_rejected',
  },
];

const INTERACTION_TRIGGERS: NotificationTrigger[] = [
  {
    label: 'Custom copy',
    status: 'simple_notification',
    data: {
      title: 'Transaction submitted',
      description: 'Your swap is being processed on Ethereum Mainnet.',
    },
  },
  {
    label: 'With close button',
    status: 'success',
    autoDismiss: true,
    data: {
      title: 'Wallet ready',
      description: 'Your wallet was imported successfully.',
    },
    onHide: () => {
      console.log('BaseNotification dismissed');
    },
  },
];

const STORY_SECTIONS: NotificationTriggerSection[] = [
  { title: 'Loading', triggers: LOADING_TRIGGERS },
  { title: 'Success', triggers: SUCCESS_TRIGGERS },
  { title: 'Failure', triggers: FAILURE_TRIGGERS },
  { title: 'Interaction', triggers: INTERACTION_TRIGGERS },
];

const StoryContainer = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('relative min-h-[320px] w-full bg-default')}>
      {children}
    </View>
  );
};

const NotificationTriggerStory = ({
  sections,
}: {
  sections: NotificationTriggerSection[];
}) => {
  const tw = useTailwind();
  const [active, setActive] = useState<ActiveNotification | null>(null);

  const showNotification = useCallback((trigger: NotificationTrigger) => {
    setActive(null);
    setTimeout(() => {
      setActive({
        key: Date.now(),
        ...trigger,
      });
    }, 50);
  }, []);

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => (
          <View key={section.title} style={tw.style('gap-2')}>
            <Text variant={TextVariant.HeadingSm}>{section.title}</Text>
            {section.triggers.map((trigger) => (
              <Button
                key={trigger.label}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => showNotification(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      {active && (
        <BaseNotification
          key={active.key}
          {...STORYBOOK_PROPS}
          status={active.status}
          data={active.data}
          autoDismiss={active.autoDismiss}
          onHide={active.onHide}
          onDismissComplete={() => setActive(null)}
        />
      )}
    </StoryContainer>
  );
};

const BaseNotificationMeta = {
  title: 'Components Temp / BaseNotification',
  component: BaseNotification,
};

export default BaseNotificationMeta;

export const Default = {
  render: () => <NotificationTriggerStory sections={STORY_SECTIONS} />,
};
