import { strings } from '../../../../locales/i18n';
import { CarouselSlide } from './types';
import { createBuyNavigationDetails } from '../Ramp/Aggregator/routes/utils';
import Routes from '../../../constants/navigation/Routes';
///: BEGIN:ONLY_INCLUDE_IF(solana)
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
        Routes.SHEET.ADD_ACCOUNT,
        {
          // @ts-expect-error - TODO: navigate callback doesn't seem correctly typed here
          clientType: WalletClientType.Solana,
          scope: SolScope.Mainnet,
        },
      ],
    },
  },
  ///: END:ONLY_INCLUDE_IF
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
];

export const SPACE_ID = () => process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID;
export const ACCESS_TOKEN = () =>
  process.env.FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN;
