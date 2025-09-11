/* eslint-disable import/no-commonjs, import/prefer-default-export, @typescript-eslint/no-require-imports */
import { WhatsNew, SlideContentType } from './types';
import { strings } from '../../../../locales/i18n';

export const whatsNew: WhatsNew = {
  // Network UI Update announcement - show to all users
  onlyUpdates: false, // false: Users who updated the app and new installs will see this. true: only users who update will see it
  maxLastAppVersion: '7.55', // When updating, only users who had a previous version < '7.55' may see the modal
  minAppVersion: '7.55.0', // Only users whose current version is >= 7.55.0 may see the modal. This should match the version with the latest copy changes in the modal.
  /**
   * Slides for Network UI Update announcement.
   * Now supports carousel images with static content.
   */
  slides: [
    [
      {
        type: SlideContentType.CAROUSEL_IMAGES,
        images: [
          {
            image: require('../../../images/whats_new_remove_gns.png'),
            alt: 'Token view with All networks dropdown',
          },
        ],
      },
      {
        type: SlideContentType.DESCRIPTION,
        description: strings('whats_new.remove_gns_new_ui_update.introduction'),
      },
      // Feature highlights with checkmarks
      {
        type: SlideContentType.DESCRIPTIONS,
        descriptions: [
          strings(
            'whats_new.remove_gns_new_ui_update.descriptions.description_1',
          ),
          strings(
            'whats_new.remove_gns_new_ui_update.descriptions.description_2',
          ),
          strings(
            'whats_new.remove_gns_new_ui_update.descriptions.description_3',
          ),
          strings(
            'whats_new.remove_gns_new_ui_update.descriptions.description_4',
          ),
        ],
      },
      {
        type: SlideContentType.MORE_INFORMATION,
        moreInformation: strings(
          'whats_new.remove_gns_new_ui_update.more_information',
        ),
      },
      {
        type: SlideContentType.BUTTON,
        buttonText: strings('whats_new.remove_gns_new_ui_update.got_it'),
        buttonType: 'blue',
        onPress: () => {
          // Simple dismissal, no navigation needed
        },
      },
    ],
  ],
};
