/* eslint-disable import/no-commonjs, import/prefer-default-export, @typescript-eslint/no-require-imports */
import { strings } from '../../../../locales/i18n';
import { WhatsNew } from './types';

export const whatsNew: WhatsNew = {
  // All users that have <5.4.0 and are updating to >=5.4.0 should see
  onlyUpdates: true, // Only users who updated the app will see this, not newly installs
  maxLastAppVersion: '5.4.0', // Only users who had a previous version <5.4.0 version will see this
  minAppVersion: '5.4.0', // Only users who updated to a version >= 5.4.0 will see this
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
        image: require('../../../images/whats-new-token-detection.png'),
      }, // eslint-disable-line
      {
        type: 'title',
        title: strings('whats_new.feature_token_detection_title'),
      },
      {
        type: 'description',
        description: strings('whats_new.feature_token_detection_description'),
      },
      {
        type: 'button',
        buttonType: 'normal',
        buttonText: strings('whats_new.feature_token_detection_button_text'),
        onPress: (props: any) =>
          props.navigation.navigate('SettingsView', {
            screen: 'SettingsFlow',
            params: {
              screen: 'AdvancedSettings',
              params: {
                scrollToBottom: true,
                isFullScreenModal: true,
              },
            },
          }),
      },
    ],
    [
      {
        type: 'title',
        title: strings('whats_new.feature_token_security_title_1'),
      },
      {
        type: 'description',
        description: strings('whats_new.feature_token_security_description_1'),
      },
      {
        type: 'title',
        title: strings('whats_new.feature_token_security_title_2'),
      },
      {
        type: 'description',
        description: strings('whats_new.feature_token_security_description_2'),
      },
      {
        type: 'image',
        image: require('../../../images/whats-new-token-security.png'),
      }, // eslint-disable-line
      {
        type: 'button',
        buttonType: 'blue',
        buttonText: strings('whats_new.feature_token_security_button_text'),
        onPress: () => null,
      },
    ],
  ],
};
