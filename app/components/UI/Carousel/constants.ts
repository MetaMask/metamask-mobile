import { ImageSourcePropType } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { CarouselSlide, SlideId } from './types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../../UI/Ramp/routes/utils';
import Routes from '../../../constants/navigation/Routes';
import cardImage from '../../../images/banners/banner_image_card.png';
import fundImage from '../../../images/banners/banner_image_fund.png';
import cashoutImage from '../../../images/banners/banner_image_cashout.png';
import aggregatedImage from '../../../images/banners/banner_image_aggregated.png';
///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
import multiSrpImage from '../../../images/banners/banner_image_multisrp.png';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(solana)
import solanaImage from '../../../images/banners/banner_image_solana.png';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF

export const PREDEFINED_SLIDES: CarouselSlide[] = [
  {
    id: 'card',
    title: strings('banner.card.title'),
    description: strings('banner.card.subtitle'),
    undismissable: false,
    navigation: { type: 'url', href: 'https://portfolio.metamask.io/card' },
    testID: WalletViewSelectorsIDs.CAROUSEL_FIRST_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_FIRST_SLIDE_TITLE,
    testIDCloseButton: WalletViewSelectorsIDs.CAROUSEL_FIRST_SLIDE_CLOSE_BUTTON,
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
    testID: WalletViewSelectorsIDs.CAROUSEL_SECOND_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_SECOND_SLIDE_TITLE,
    testIDCloseButton:
      WalletViewSelectorsIDs.CAROUSEL_SECOND_SLIDE_CLOSE_BUTTON,
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
    testID: WalletViewSelectorsIDs.CAROUSEL_THIRD_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_THIRD_SLIDE_TITLE,
    testIDCloseButton: WalletViewSelectorsIDs.CAROUSEL_THIRD_SLIDE_CLOSE_BUTTON,
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
    testID: WalletViewSelectorsIDs.CAROUSEL_FOURTH_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_FOURTH_SLIDE_TITLE,
    testIDCloseButton:
      WalletViewSelectorsIDs.CAROUSEL_FOURTH_SLIDE_CLOSE_BUTTON,
  },
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
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
    testID: WalletViewSelectorsIDs.CAROUSEL_FIFTH_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_FIFTH_SLIDE_TITLE,
    testIDCloseButton: WalletViewSelectorsIDs.CAROUSEL_FIFTH_SLIDE_CLOSE_BUTTON,
  },
  ///: END:ONLY_INCLUDE_IF
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
    testID: WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE_TITLE,
    testIDCloseButton: WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE_CLOSE_BUTTON,
  },
  ///: END:ONLY_INCLUDE_IF
];

export const BANNER_IMAGES: Record<SlideId, ImageSourcePropType> = {
  card: cardImage,
  fund: fundImage,
  cashout: cashoutImage,
  aggregated: aggregatedImage,
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  multisrp: multiSrpImage,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  solana: solanaImage as ImageSourcePropType,
  ///: END:ONLY_INCLUDE_IF
};
