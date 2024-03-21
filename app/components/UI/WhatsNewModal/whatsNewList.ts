/* eslint-disable import/no-commonjs, import/prefer-default-export, @typescript-eslint/no-require-imports */
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { isBlockaidFeatureEnabled } from '../../../util/blockaid';
import { WhatsNew } from './types';

export const whatsNew: WhatsNew = {
  // All users that have <6.4.0 and are updating to >=6.4.0 should see
  onlyUpdates: false, // false: Users who updated the app and new installs will see this. true: only users who update will see it
  maxLastAppVersion: '7.20', // When updating, only users who had a previous version < '7.20' may see the modal
  minAppVersion: '7.16.0', // Only users whose current version is >= 7.16.0 may see the modal. This should match the version with the latest copy changes in the modal.
  /**
   * Slides utilizes a templating system in the form of a 2D array, which is eventually rendered within app/components/UI/WhatsNewModal/index.js.
   * The root layer determines the number of slides. Ex. To display 3 slides, the root layer should contain 3 arrays.
   * The inner layer determines the content that will be rendered within each slide.
   * The slide content takes the form of union types, where the possible types are `image`, `title`, `description`, or `button`.
   * Both slide count and slide content will be rendered in the same order as the data set.
   */
  slides: [
    ...(isBlockaidFeatureEnabled()
      ? ([
          [
            {
              type: 'title',
              title: strings('whats_new.blockaid.title'),
            },
            {
              type: 'image',
              image: require('../../../images/whats_new_blockaid.png'),
            },
            {
              type: 'description',
              description: strings('whats_new.blockaid.description_1'),
            },
            {
              type: 'description',
              description: strings('whats_new.blockaid.description_2'),
            },
            {
              type: 'description',
              description: strings('whats_new.blockaid.description_3'),
            },
            {
              type: 'button',
              buttonText: strings('whats_new.blockaid.got_it'),
              buttonType: 'blue',
              onPress: (props) =>
                props.navigation.navigate(Routes.SETTINGS_VIEW, {
                  screen: Routes.SETTINGS.EXPERIMENTAL_SETTINGS,
                }),
            },
          ],
        ] as WhatsNew['slides'])
      : []),
  ],
};
