/* eslint-disable import/prefer-default-export */
import { WhatsNew } from './types';

export const whatsNew: WhatsNew = {
  // All users that have <1.0.7 and are updating to >=1.0.7 should see
  onlyUpdates: true, // Only users who updated the app will see this, not newly installs
  maxLastAppVersion: '1.0.7', // Only users who had a previous version <1.0.7 version will see this
  minAppVersion: '1.0.7', // Only users who updated to a version >= 1.0.7 will see this
  slides: [[], [], []],
};
