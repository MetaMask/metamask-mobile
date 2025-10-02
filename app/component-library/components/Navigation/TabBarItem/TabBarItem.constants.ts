/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies.
import { TabBarItemProps } from './TabBarItem.types';

export const SAMPLE_TABBARITEM_PROPS: TabBarItemProps = {
  label: 'TABBARITEM LABEL',
  iconName: IconName.Add,
  onPress: () => console.log('TabBarItem clicked'),
  isActive: false,
  isTradeButton: false,
};
