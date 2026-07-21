import { strings } from '../../../../locales/i18n';
import { CarouselSlide } from './types';
import { createBuyNavigationDetails } from '../Ramp/Aggregator/routes/utils';

export const PREDEFINED_SLIDES: CarouselSlide[] = [
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
