/* eslint-disable import/no-commonjs, import/prefer-default-export, @typescript-eslint/no-require-imports */
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { WhatsNew } from './types';

export const whatsNew: WhatsNew = {
  // All users that have <6.4.0 and are updating to >=6.4.0 should see
  onlyUpdates: false, // Users who updated the app and new installs will see this.
  maxLastAppVersion: '6.4.0', // Only users who had a previous version <6.4.0 version will see this
  minAppVersion: '6.4.0', // Only users who updated to a version >= 6.4.0 will see this
  /**
   * Slides utilizes a templating system in the form of a 2D array, which is eventually rendered within app/components/UI/WhatsNewModal/index.js.
   * The root layer determines the number of slides. Ex. To display 3 slides, the root layer should contain 3 arrays.
   * The inner layer determines the content that will be rendered within each slide.
   * The slide content takes the form of union types, where the possible types are `image`, `title`, `description`, or `button`.
   * Both slide count and slide content will be rendered in the same order as the data set.
   */
  slides: [
    [
      {
        type: 'image',
        image: require('../../../images/whats-new-onramp-slide-1.png'),
      },
      {
        type: 'title',
        title: strings('whats_new.slide_1_subtitle'),
      },
      {
        type: 'description',
        description: strings('whats_new.slide_1_body_1'),
      },
      {
        type: 'description',
        description: strings('whats_new.slide_1_body_2'),
      },
      {
        type: 'button',
        buttonType: 'normal',
        buttonText: strings('whats_new.slides_button'),
        onPress: (props: any) =>
          props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID),
      },
    ],
    [
      {
        type: 'image',
        image: require('../../../images/whats-new-onramp-slide-2.png'),
      },
      {
        type: 'title',
        title: strings('whats_new.slide_2_subtitle'),
      },
      {
        type: 'description',
        description: strings('whats_new.slide_2_body_1'),
      },
      {
        type: 'button',
        buttonType: 'normal',
        buttonText: strings('whats_new.slides_button'),
        onPress: (props: any) =>
          props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID),
      },
    ],
    [
      {
        type: 'image',
        image: require('../../../images/whats-new-onramp-slide-3.png'),
      },
      {
        type: 'title',
        title: strings('whats_new.slide_3_subtitle'),
      },
      {
        type: 'description',
        description: strings('whats_new.slide_3_body_1'),
      },
      {
        type: 'button',
        buttonType: 'normal',
        buttonText: strings('whats_new.slides_button'),
        onPress: (props: any) =>
          props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID),
      },
    ],
    [
      {
        type: 'image',
        image: require('../../../images/whats-new-onramp-slide-4.png'),
      },
      {
        type: 'title',
        title: strings('whats_new.slide_4_subtitle'),
      },
      {
        type: 'description',
        description: strings('whats_new.slide_4_body_1'),
      },
      {
        type: 'button',
        buttonType: 'normal',
        buttonText: strings('whats_new.slides_button'),
        onPress: (props: any) =>
          props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID),
      },
    ],
    [
      {
        type: 'image',
        image: require('../../../images/whats-new-onramp-slide-5.png'),
      },
      {
        type: 'title',
        title: strings('whats_new.slide_5_subtitle'),
      },
      {
        type: 'description',
        description: strings('whats_new.slide_5_body_1'),
      },
      {
        type: 'button',
        buttonType: 'normal',
        buttonText: strings('whats_new.slides_button'),
        onPress: (props: any) =>
          props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID),
      },
    ],
  ],
};
