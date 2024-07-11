/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as BadgeBadgeNotificationssComponent } from './BadgeNotifications';
import { SAMPLE_BADGENOTIFICATIONS_PROPS } from './BadgeNotifications.constants';
import { BadgeNotificationsProps } from './BadgeNotifications.types';

const BadgeBadgeNotificationsMeta = {
  title: 'Component Library / Badges',
  component: BadgeBadgeNotificationssComponent,
  argTypes: {
    iconName: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BADGENOTIFICATIONS_PROPS.iconName,
    },
  },
};
export default BadgeBadgeNotificationsMeta;

export const BadgeNotification = {
  render: (args: JSX.IntrinsicAttributes & BadgeNotificationsProps) => (
    <View
      style={{
        height: 50,
        width: 50,
      }}
    >
      <BadgeBadgeNotificationssComponent
        {...args}
        iconName={SAMPLE_BADGENOTIFICATIONS_PROPS.iconName}
      />
    </View>
  ),
};
