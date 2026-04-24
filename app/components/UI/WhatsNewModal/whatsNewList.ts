/* eslint-disable import/prefer-default-export */
import { strings } from '../../../../locales/i18n';
import { WhatsNew } from './types';

export const whatsNew: WhatsNew = {
  // All users that have <5.3.0 and are updating to >=5.3.0 should see
  onlyUpdates: false, // Only users who updated the app will see this, not newly installs
  maxLastAppVersion: '5.3.0', // Only users who had a previous version <5.3.0 version will see this
  minAppVersion: '5.3.0', // Only users who updated to a version >=5.3.0 will see this
  slides: [
    [
      {
        type: 'image',
        /* eslint-disable import/no-commonjs, @typescript-eslint/no-require-imports */
        images: {
          light: require('../../../images/whats_new_onramp_agg_light.png'),
          dark: require('../../../images/whats_new_onramp_agg_dark.png'),
        },
      },
      {
        type: 'title',
        title: strings('whats_new.feature_on_ramp_title'),
      },
      {
        type: 'description',
        description: strings('whats_new.feature_on_ramp_text'),
      },
      {
        type: 'description',
        description: strings('whats_new.feature_on_ramp_text_description'),
      },
      {
        type: 'button',
        buttonType: 'blue',
        buttonText: strings('whats_new.feature_on_ramp_button'),
        onPress: () => null,
      },
    ],
  ],
};
