import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Icon,
  IconName,
  IconSize,
  ListItem,
} from '@metamask/design-system-react-native';

export interface ManageCardListItemProps {
  title: string;
  description: string | React.ReactNode;
  rightIcon?: IconName;
  rightElement?: React.ReactNode;
  testID?: string;
  onPress?: () => void;
  isLoading?: boolean;
}

const ManageCardListItem: React.FC<ManageCardListItemProps> = ({
  title,
  onPress,
  description,
  rightIcon,
  rightElement,
  testID = 'manage-card-list-item',
  isLoading = false,
}) => {
  const endAccessory = isLoading ? (
    <ActivityIndicator size="small" />
  ) : (
    (rightElement ??
    (rightIcon ? <Icon size={IconSize.Md} name={rightIcon} /> : undefined))
  );

  const sharedProps = {
    title,
    titleProps: { numberOfLines: 1 as const },
    description,
    endAccessory,
    accessoryGap: 4 as const,
    testID,
    twClassName: 'bg-background-default',
  };

  if (onPress) {
    return <ListItem isInteractive onPress={onPress} {...sharedProps} />;
  }

  return <ListItem {...sharedProps} />;
};

export default ManageCardListItem;
