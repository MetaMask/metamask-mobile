/* eslint-disable no-console */
import { IconName } from '../../../../component-library/components/Icons/Icon';
import NotificationTypes from '../../../../util/notifications';
import { NotificationsActionsTypes } from '../../Settings/NotificationsSettings/NotificationsSettings.constants';
import { Notification } from '../types';

const mockNotifications: Notification[] = Array(9)
  .fill(null)
  .map((_, index) => ({
    id: `notification-${index}`,
    isVisible: true,
    autodismiss: 3000,
    title: `Notification ${index}`,
    message: `This is notification ${index}`,
    imageUri: 'https://via.placeholder.com/450',
    status: `${index}`,
    type: NotificationTypes.TRANSACTION,
    actionsType: NotificationsActionsTypes.RECEIVED,
    timestamp: new Date().toISOString(),
    // cta: {
    //   label: 'Renew now',
    //   icon: IconName.ArrowRight,
    //   onPress: () => console.log(`Notification ${index} dismissed`),
    // },
    data: {
      transaction: {
        id: `0x${index}`,
        chainId: '0x1',
        from: '0xdb24b8170Fc863c77f50a2b25297f642C5Fe5010',
        to: '0xdb24b8170Fc863c77f50a2b25297f642C5Fe5012',
        status: 'confirmed',
        nonce: '0x1',
        gasUsed: '0.00039275 ETH ($0.62)',
        value: '000.1',
        asset: {
          address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
          symbol: 'stETH',
          name: 'Lido',
          isETH: true,
          isNFT: true,
          nftUri:
            'https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/6125',
        },
        time: new Date().toISOString(),
      },
    },
  }));

export default mockNotifications;
