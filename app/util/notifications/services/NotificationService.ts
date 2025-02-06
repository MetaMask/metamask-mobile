import notifee, {
  AuthorizationStatus,
  Event as NotifeeEvent,
  EventType,
  EventDetail,
  AndroidChannel,
} from '@notifee/react-native';

import { HandleNotificationCallback, LAUNCH_ACTIVITY, INotification as Notification, PressActionId } from '../types';

import { Linking, Platform, Alert as NativeAlert } from 'react-native';
import {
  ChannelId,
  notificationChannels,
} from '../../../util/notifications/androidChannels';

import { strings } from '../../../../locales/i18n';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';
import { store } from '../../../store';
import Logger from '../../../util/Logger';
import { withTimeout } from '../methods';

interface AlertButton {
  text: string;
  onPress: () => void | Promise<void>;
}

class NotificationsService {
  async getBlockedNotifications(): Promise<Map<ChannelId, boolean>> {
    try {
      const settings = await notifee.getNotificationSettings();
      const channels = await notifee.getChannels();

      switch (settings.authorizationStatus) {
        case AuthorizationStatus.NOT_DETERMINED:
        case AuthorizationStatus.DENIED:
          return notificationChannels.reduce((map, next) => {
            map.set(next.id as ChannelId, true);
            return map;
          }, new Map<ChannelId, boolean>());
      }

      return channels.reduce((map, next) => {
        if (next.blocked) {
          map.set(next.id as ChannelId, true);
        }
        return map;
      }, new Map<ChannelId, boolean>());
    } catch (e) {
      Logger.error(
        e as Error,
        strings('notifications.error_checking_permission'),
      );
      return new Map<ChannelId, boolean>();
    }
  }

  async getAllPermissions(shouldOpenSettings = true) {
    const promises: Promise<string>[] = notificationChannels.map(
      (channel: AndroidChannel) =>
        withTimeout(this.createChannel(channel), 5000),
    );
    await Promise.allSettled(promises);
    const permission = await withTimeout(this.requestPermission(), 5000);
    const blockedNotifications = await withTimeout(
      this.getBlockedNotifications(),
      5000,
    );
    if (
      (permission !== 'authorized' || blockedNotifications.size !== 0) &&
      shouldOpenSettings
    ) {
      await this.requestPushNotificationsPermission();
    }
    return { permission, blockedNotifications };
  }

  async isDeviceNotificationEnabled() {
    const permission = await notifee.getNotificationSettings();

    const isAuthorized =
      permission.authorizationStatus === AuthorizationStatus.AUTHORIZED;

    store.dispatch({
      type: 'TOGGLE_DEVICE_NOTIFICATIONS',
      deviceNotificationEnabled: isAuthorized,
    });
    return isAuthorized;
  }

  defaultButtons = (resolve: (value: boolean) => void): AlertButton[] => [
    {
      text: strings('notifications.prompt_cancel'),
      onPress: () => {
        const promptCount = mmStorage.getLocal(
          STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
        );
        mmStorage.saveLocal(
          STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
          promptCount + 1,
        );
        mmStorage.saveLocal(
          STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_TIME,
          Date.now().toString(),
        );

        resolve(false);
      },
    },
    {
      text: strings('notifications.prompt_ok'),
      onPress: async () => {
        this.openSystemSettings();
        resolve(true);
      },
    },
  ];

  asyncAlert = (
    title: string,
    msg: string,
    getButtons: (resolve: (value: boolean) => void) => AlertButton[] = this
      .defaultButtons,
  ): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      NativeAlert.alert(title, msg, getButtons(resolve), {
        cancelable: false,
      });
    });

  async requestPushNotificationsPermission(): Promise<void> {
    try {
      await this.asyncAlert(
        strings('notifications.prompt_title'),
        strings('notifications.prompt_desc'),
      );
    } catch (e) {
      Logger.error(
        e as Error,
        strings('notifications.error_checking_permission'),
      );
    }
  }
  openSystemSettings() {
    if (Platform.OS === 'ios') {
      Linking.openSettings();
    } else {
      notifee.openNotificationSettings();
    }
  }

  async requestPermission() {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
      ? 'authorized'
      : 'denied';
  }

  onForegroundEvent = (
    observer: (event: NotifeeEvent) => Promise<void>,
  ): (() => void) => notifee.onForegroundEvent(observer);

  onBackgroundEvent = (observer: (event: NotifeeEvent) => Promise<void>) =>
    notifee.onBackgroundEvent(observer);

  incrementBadgeCount = async (incrementBy?: number) => {
    notifee.incrementBadgeCount(incrementBy);
  };

  decrementBadgeCount = async (decrementBy?: number) => {
    notifee.decrementBadgeCount(decrementBy);
  };

  setBadgeCount = async (count: number) => {
    notifee.setBadgeCount(count);
  };

  getBadgeCount = async () => notifee.getBadgeCount();

  handleNotificationPress = async ({
    detail,
    callback,
  }: {
    detail: EventDetail;
    callback?: (notification: Notification) => void;
  }) => {
    this.decrementBadgeCount(1);
    if (detail?.notification?.id) {
      await this.cancelTriggerNotification(detail.notification.id);
    }

    if (detail?.notification?.data) {
      callback?.(detail.notification as Notification);
    }
  };

  handleNotificationEvent = async ({
    type,
    detail,
    callback,
  }: NotifeeEvent & {
    callback?: (notification: Notification) => void;
  }) => {
    switch (type as unknown as EventType) {
      case EventType.DELIVERED:
        this.incrementBadgeCount(1);
        break;
      case EventType.PRESS:
        this.handleNotificationPress({
          detail,
          callback,
        });
        break;
    }
  };

  cancelTriggerNotification = async (id?: string) => {
    if (!id) return;
    await notifee.cancelTriggerNotification(id);
  };

  getInitialNotification = async (
    callback: HandleNotificationCallback
  ): Promise<void> => {
    const event = await notifee.getInitialNotification()
    if (event) {
      callback(event.notification.data as Notification['data'])
    }
  };

  cancelAllNotifications = async () => {
    await notifee.cancelAllNotifications();
  };

  createChannel = async (channel: AndroidChannel): Promise<string> =>
    notifee.createChannel(channel);

  displayNotification = async ({
    channelId,
    title,
    body,
    data
  }: {
    channelId: ChannelId
    title: string
    body?: string
    data?: Notification['data']
  }): Promise<void> => {
    await notifee.displayNotification({
      title,
      body,
      data: data as unknown as Notification['data'],
      android: {
        smallIcon: 'ic_notification_small',
        largeIcon: 'ic_notification',
        channelId: channelId ?? ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
        pressAction: {
          id: PressActionId.OPEN_NOTIFICATIONS_VIEW,
          launchActivity: LAUNCH_ACTIVITY,
        }
      },
      ios: {
        launchImageName: 'Default',
        sound: 'default',
        interruptionLevel: 'critical',
        foregroundPresentationOptions: {
          alert: true,
          sound: true,
          badge: true,
          banner: true,
          list: true,
        },
      },
    });
  };
}

export default new NotificationsService();