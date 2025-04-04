/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
// External dependencies.
import { mockTheme } from '../../../../util/theme';
import { IconName, IconColor } from '../../Icons/Icon';
import { AvatarSize } from '../../Avatars/Avatar';

// Internal dependencies.
import { TabBarItemProps } from './TabBarItem.types';

export const SAMPLE_TABBARITEM_PROPS: TabBarItemProps = {
  label: 'TABBARITEM LABEL',
  icon: IconName.Add,
  onPress: () => console.log('TabBarItem clicked'),
  iconSize: AvatarSize.Md,
  iconColor: IconColor.Primary,
  iconBackgroundColor: mockTheme.colors.background.default,
};
