import notifee, {
  AndroidStyle,
  EventType,
  type Event as NotifeeEvent,
  type EventDetail,
} from '@notifee/react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { AppState, Platform } from 'react-native';
import { ChannelId, notificationChannels } from '../androidChannels';
import { LAUNCH_ACTIVITY } from '../types';
import { toFcmDataStringRecord } from '../utils/fcm-data';
import {
  assetLink,
  displayWithFallback,
  formatPriceAlert,
  isPriceAlertDelivery,
  PRICE_ALERT_DELIVERY,
  parsePriceAlert,
  PRICE_ALERT_CATEGORY,
  SWAP_TOKEN,
  swapLink,
  VIEW_TOKEN,
} from './payload';
import { writeSparkline } from './sparkline';

type PriceAlertMessage = Pick<
  FirebaseMessagingTypes.RemoteMessage,
  'data' | 'notification'
>;

const channel = notificationChannels[0];
const tokenIcon = 'app_images_ethlogo';

function androidPressAction(id: string) {
  return { id, launchActivity: LAUNCH_ACTIVITY };
}

export async function displayPriceAlert(message: PriceAlertMessage) {
  const { data } = message;
  const fallbackTitle = message.notification?.title ?? data?.fallback_title;
  const fallbackBody = message.notification?.body ?? data?.fallback_body;
  if (typeof fallbackTitle !== 'string' || typeof fallbackBody !== 'string') {
    return;
  }

  const id = `price-alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const android = {
    channelId: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
    smallIcon: 'ic_notification_small',
    pressAction: androidPressAction('default'),
  };

  await displayWithFallback(
    data,
    async (priceAlert) => {
      const { title, change } = formatPriceAlert(priceAlert);
      const isAndroid = Platform.OS === 'android';
      const isUp = priceAlert.change >= 0;
      const color = isUp ? '#16794F' : '#B63131';
      const trend = `<font color="${color}"><b>${isUp ? '▲' : '▼'} ${change}</b></font>`;
      const body = isAndroid
        ? `${priceAlert.compactContext} · ${trend}`
        : `${change}  ·  ${priceAlert.description}`;
      const largeIcon =
        priceAlert.assetId === 'eip155:1/slip44:60' ? tokenIcon : undefined;
      const actionData = {
        ...toFcmDataStringRecord(data),
        deeplink: '',
        mm_local: PRICE_ALERT_DELIVERY,
      };
      if (!isAndroid) {
        await registerPriceAlertCategory();
        await notifee.displayNotification({
          id,
          title,
          body,
          data: actionData,
          ios: { categoryId: PRICE_ALERT_CATEGORY, sound: 'default' },
        });
        return;
      }

      await notifee.createChannel(channel);
      const picture = await writeSparkline(id, priceAlert);
      await notifee.displayNotification({
        id,
        title,
        body,
        data: actionData,
        android: {
          ...android,
          color: '#FA4B00',
          largeIcon,
          style: {
            type: AndroidStyle.BIGPICTURE,
            picture,
            title,
            summary: body,
          },
          actions: [
            {
              title: 'View token',
              pressAction: androidPressAction(VIEW_TOKEN),
            },
            { title: 'Swap', pressAction: androidPressAction(SWAP_TOKEN) },
          ],
        },
      });
    },
    async () => {
      if (Platform.OS === 'android') {
        await notifee.createChannel(channel);
      }
      const deeplink = data?.deeplink;
      await notifee.displayNotification({
        id,
        title: fallbackTitle,
        body: fallbackBody,
        data: {
          mm_local: PRICE_ALERT_DELIVERY,
          ...(typeof deeplink === 'string' ? { deeplink } : {}),
        },
        android,
        ios: { sound: 'default' },
      });
    },
  );
}

export async function registerPriceAlertCategory() {
  const categories = await notifee.getNotificationCategories();
  await notifee.setNotificationCategories([
    ...categories
      .filter(({ id }) => id !== PRICE_ALERT_CATEGORY)
      .map((category) => ({
        ...category,
        allowInCarPlay: Boolean(category.allowInCarPlay),
        allowAnnouncement: Boolean(category.allowAnnouncement),
        hiddenPreviewsShowTitle: Boolean(category.hiddenPreviewsShowTitle),
        hiddenPreviewsShowSubtitle: Boolean(
          category.hiddenPreviewsShowSubtitle,
        ),
        actions: category.actions?.map((action) => ({
          ...action,
          destructive: Boolean(action.destructive),
          foreground: Boolean(action.foreground),
          authenticationRequired: Boolean(action.authenticationRequired),
          input:
            typeof action.input === 'number'
              ? action.input
                ? true
                : undefined
              : action.input,
        })),
      })),
    {
      id: PRICE_ALERT_CATEGORY,
      actions: [
        { id: VIEW_TOKEN, title: 'View token', foreground: true },
        { id: SWAP_TOKEN, title: 'Swap', foreground: true },
      ],
    },
  ]);
}

export function onBackgroundPriceAlertMessage(
  message: PriceAlertMessage,
): Promise<void> {
  if (
    Platform.OS !== 'android' ||
    message.notification ||
    !isPriceAlertDelivery(message.data)
  ) {
    return Promise.resolve();
  }
  return displayPriceAlert(message);
}

let lastHandledId: string | undefined;
let pendingLink: string | undefined;
let onOpen: ((link: string) => void) | undefined;

function flushPriceAlertAction() {
  if (pendingLink && onOpen && AppState.currentState === 'active') {
    const link = pendingLink;
    pendingLink = undefined;
    onOpen(link);
  }
}

function handlePriceAlertAction(detail: EventDetail) {
  const { notification, pressAction } = detail;
  if (
    !notification?.data ||
    (notification.id === lastHandledId && lastHandledId !== undefined)
  ) {
    return;
  }
  const action = pressAction?.id;
  if (action !== 'default' && action !== VIEW_TOKEN && action !== SWAP_TOKEN) {
    return;
  }
  const priceAlert = parsePriceAlert(notification.data);
  let link: string | undefined;
  if (priceAlert) {
    link = action === SWAP_TOKEN ? swapLink(priceAlert) : assetLink(priceAlert);
  } else if (
    notification.data.mm_local === PRICE_ALERT_DELIVERY &&
    action === 'default'
  ) {
    const { deeplink } = notification.data;
    link = typeof deeplink === 'string' ? deeplink : undefined;
  }
  if (!link) {
    return;
  }
  lastHandledId = notification.id;
  pendingLink = link;
  flushPriceAlertAction();
}

export async function onPriceAlertEvent({ type, detail }: NotifeeEvent) {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    handlePriceAlertAction(detail);
  }
}

export function subscribePriceAlertActions(callback: (link: string) => void) {
  onOpen = callback;
  flushPriceAlertAction();
  AppState.addEventListener('change', flushPriceAlertAction);
  if (Platform.OS === 'android') {
    notifee
      .getInitialNotification()
      .then((initial) => {
        if (initial) {
          handlePriceAlertAction(initial);
        }
      })
      .catch(() => undefined);
  }
}
