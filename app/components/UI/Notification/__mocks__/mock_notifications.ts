import { ACTIONS, PREFIXES } from '../../../../constants/deeplinks';
import { Notification, TRIGGER_TYPES } from '../../../../util/notifications';

interface NotificationLink {
  linkText: string;
  linkUrl: string;
  isExternal: boolean;
}

interface NotificationAction {
  actionText: string;
  actionUrl: string;
  isExternal: boolean;
}

const createNotificationBase = (
  id: string,
  type: keyof typeof TRIGGER_TYPES,
  createdAt: Date = new Date(),
  isRead = false,
): Omit<Notification, 'data'> => ({
  id,
  type: TRIGGER_TYPES[type],
  createdAt,
  isRead,
});

const ETH_IMAGE_URL =
  'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg';
const STETH_IMAGE_URL =
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/stETH.svg';
import SVG_MM_LOGO_PATH from '../../../../images/fox.svg';

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    ...createNotificationBase('1', 'FEATURES_ANNOUNCEMENT'),
    data: {
      title: 'Welcome to the new MyMetaverse!',
      shortDescription:
        'We are excited to announce the launch of our brand new website and app!',
      longDescription:
        'We are excited to announce the launch of our brand new website and app!',
      category: 'Announcement',
      image: {
        file: {
          url: SVG_MM_LOGO_PATH,
        },
      },
      link: {
        linkText: 'Learn more',
        linkUrl: 'https://metamask.io',
        isExternal: true,
      } as NotificationLink,
      action: {
        actionText: 'Send now!',
        actionUrl: PREFIXES[ACTIONS.SEND],
        isExternal: false,
      } as NotificationAction,
    },
  },
  {
    ...createNotificationBase('2', 'LIDO_STAKE_COMPLETED'),
    trigger_id: 'some-trigger-id',
    chain_id: 1,
    block_number: 20069079,
    block_timestamp: '1698961091',
    tx_hash:
      '0x6271899e371c87ff96307d5ffed7ddcc39dcee5742bfab4f395501f6bf4c2002',
    unread: false,
    created_at: '2023-11-02T22:28:49.970865Z',
    data: {
      kind: 'lido_stake_completed',
      stake_in: {
        usd: '1806.33',
        name: 'Ethereum',
        image: ETH_IMAGE_URL,
        amount: '330303634023928032',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: '18',
      },
      stake_out: {
        usd: '1801.30',
        name: 'Liquid staked Ether 2.0',
        image: STETH_IMAGE_URL,
        amount: '330303634023928032',
        symbol: 'STETH',
        address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
        decimals: '18',
      },
      network_fee: {
        gas_price: '26536359866',
        native_token_price_in_usd: '1806.33',
      },
    },
  } as Notification,
];

export default MOCK_NOTIFICATIONS;
