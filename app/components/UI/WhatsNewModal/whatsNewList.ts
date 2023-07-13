/* eslint-disable import/no-commonjs, import/prefer-default-export, @typescript-eslint/no-require-imports */
import { WhatsNew } from './types';

export const whatsNew: WhatsNew = {
  // All users that have <6.4.0 and are updating to >=6.4.0 should see
  onlyUpdates: true, // Users who updated the app and new installs will see this.
  maxLastAppVersion: '6.4.0', // Only users who had a previous version <6.4.0 version will see this
  minAppVersion: '6.4.0', // Only users who updated to a version >= 6.4.0 will see this
  /**
   * Slides utilizes a templating system in the form of a 2D array, which is eventually rendered within app/components/UI/WhatsNewModal/index.js.
   * The root layer determines the number of slides. Ex. To display 3 slides, the root layer should contain 3 arrays.
   * The inner layer determines the content that will be rendered within each slide.
   * The slide content takes the form of union types, where the possible types are `image`, `title`, `description`, or `button`.
   * Both slide count and slide content will be rendered in the same order as the data set.
   */
  slides: [],
};
