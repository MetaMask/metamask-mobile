import { ImageSourcePropType } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { CarouselSlide, SlideId } from './types';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../../UI/Ramp/routes/utils';
import Routes from '../../../constants/navigation/Routes';
import cardImage from '../../../images/banners/banner_image_card.png';
import fundImage from '../../../images/banners/banner_image_fund.png';
import cashoutImage from '../../../images/banners/banner_image_cashout.png';
import aggregatedImage from '../../../images/banners/banner_image_aggregated.png';
import backupAndSyncImage from '../../../images/banners/banner_image_backup_and_sync.png';
import multiSrpImage from '../../../images/banners/banner_image_multisrp.png';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import solanaImage from '../../../images/banners/banner_image_solana.png';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF

export const PREDEFINED_SLIDES: CarouselSlide[] = [
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  {
    id: 'solana',
    title: strings('banner.solana.title'),
    description: strings('banner.solana.subtitle'),
    undismissable: false,
    navigation: {
      type: 'function',
      navigate: () => [
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.ADD_ACCOUNT,
          params: {
            clientType: WalletClientType.Solana,
            scope: SolScope.Mainnet,
          },
        },
      ],
    },
  },
  ///: END:ONLY_INCLUDE_IF
  {
    id: 'card',
    title: strings('banner.card.title'),
    description: strings('banner.card.subtitle'),
    undismissable: false,
    navigation: { type: 'url', href: 'https://portfolio.metamask.io/card' },
  },
  {
    id: 'fund',
    title: strings('banner.fund.title'),
    description: strings('banner.fund.subtitle'),
    undismissable: false,
    navigation: {
      type: 'function',
      navigate: () => createBuyNavigationDetails(),
    },
  },
  {
    id: 'cashout',
    title: strings('banner.cashout.title'),
    description: strings('banner.cashout.subtitle'),
    undismissable: false,
    navigation: {
      type: 'function',
      navigate: () => createSellNavigationDetails(),
    },
  },
  {
    id: 'aggregated',
    title: strings('banner.aggregated.title'),
    description: strings('banner.aggregated.subtitle'),
    undismissable: false,
    navigation: {
      type: 'route',
      route: Routes.ONBOARDING.GENERAL_SETTINGS,
      navigationStack: Routes.SETTINGS_VIEW,
    },
  },
  {
    id: 'multisrp',
    title: strings('banner.multisrp.title'),
    description: strings('banner.multisrp.subtitle'),
    undismissable: false,
    navigation: {
      type: 'route',
      route: Routes.MULTI_SRP.IMPORT,
      navigationStack: Routes.SHEET.ACCOUNT_ACTIONS,
    },
  },
  {
    id: 'backupAndSync',
    title: strings('banner.backupAndSync.title'),
    description: strings('banner.backupAndSync.subtitle'),
    undismissable: false,
    navigation: {
      type: 'route',
      route: Routes.IDENTITY.TURN_ON_BACKUP_AND_SYNC,
    },
  },
];

export const BANNER_IMAGES: Record<SlideId, ImageSourcePropType> = {
  card: cardImage,
  fund: fundImage,
  cashout: cashoutImage,
  aggregated: aggregatedImage,
  multisrp: multiSrpImage,
  backupAndSync: backupAndSyncImage,
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  solana: solanaImage,
  ///: END:ONLY_INCLUDE_IF
};
