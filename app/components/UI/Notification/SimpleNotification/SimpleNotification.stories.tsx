import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import SimpleNotification from './index';
import { BaseNotificationStatus } from '../../../../component-library/components-temp/BaseNotification/BaseNotification.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
});

interface SimpleNotificationStoryArgs {
  status: BaseNotificationStatus;
  title: string;
  description: string;
  isInBrowserView: boolean;
}

const SimpleNotificationStory = ({
  status,
  title,
  description,
  isInBrowserView,
}: SimpleNotificationStoryArgs) => {
  const notificationAnimated = useSharedValue(0);

  return (
    <View style={styles.container}>
      <SimpleNotification
        isInBrowserView={isInBrowserView}
        notificationAnimated={notificationAnimated}
        hideCurrentNotification={() => undefined}
        currentNotification={{
          status,
          title,
          description,
        }}
      />
    </View>
  );
};

const SimpleNotificationMeta = {
  title: 'Components / SimpleNotification',
  component: SimpleNotification,
  argTypes: {
    status: {
      options: ['simple_notification', 'simple_notification_rejected'],
      control: { type: 'select' },
      defaultValue: 'simple_notification',
    },
    title: {
      control: { type: 'text' },
      defaultValue: 'Token added',
    },
    description: {
      control: { type: 'text' },
      defaultValue: 'USDC has been added to your wallet.',
    },
    isInBrowserView: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
  },
};

export default SimpleNotificationMeta;

export const Success = {
  args: {
    status: 'simple_notification',
    title: 'Token added',
    description: 'USDC has been added to your wallet.',
    isInBrowserView: false,
  },
  render: (args: SimpleNotificationStoryArgs) => (
    <SimpleNotificationStory {...args} />
  ),
};

export const Rejected = {
  args: {
    status: 'simple_notification_rejected',
    title: 'Request rejected',
    description: 'The connection request was declined.',
    isInBrowserView: false,
  },
  render: (args: SimpleNotificationStoryArgs) => (
    <SimpleNotificationStory {...args} />
  ),
};

export const InBrowserView = {
  args: {
    status: 'simple_notification',
    title: 'Token added',
    description: 'USDC has been added to your wallet.',
    isInBrowserView: true,
  },
  render: (args: SimpleNotificationStoryArgs) => (
    <SimpleNotificationStory {...args} />
  ),
};
