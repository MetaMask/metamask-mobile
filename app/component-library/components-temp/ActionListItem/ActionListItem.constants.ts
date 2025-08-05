// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import { ActionListItemProps } from './ActionListItem.types';

// Test IDs
export const ACTIONLISTITEM_TESTID = 'actionlistitem';

// Sample props
export const SAMPLE_ACTIONLISTITEM_PROPS: ActionListItemProps = {
  label: 'Sample Action',
  description: 'This is a sample action description',
  iconName: IconName.Add,
  onPress: () => console.log('Action pressed'),
};
