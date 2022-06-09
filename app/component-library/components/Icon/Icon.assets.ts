/* eslint-disable import/prefer-default-export, import/no-commonjs, @typescript-eslint/no-require-imports */
import { AssetByIconName, IconName } from './Icon.types';

/**
 * Asset stored by icon name
 */
export const assetByIconName: AssetByIconName = {
  [IconName.LockFilled]: require('./assets/lock-filled.png'),
  [IconName.AddOutline]: require('./assets/add-outline.png'),
};
