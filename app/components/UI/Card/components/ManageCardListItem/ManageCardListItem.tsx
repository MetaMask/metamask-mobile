import React from 'react';
import { TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import ListItem from '../../../../../component-library/components/List/ListItem/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import createStyles from './ManageCardListItem.styles';

export interface ManageCardListItemProps {
  title: string;
  description: string | React.ReactNode;
  descriptionOrientation?: 'row' | 'column';
  rightIcon?: IconName;
  testID?: string;
  onPress?: () => void;
  isLoading?: boolean;
}

const ManageCardListItem: React.FC<ManageCardListItemProps> = ({
  title,
  onPress,
  description,
  descriptionOrientation = 'column',
  rightIcon,
  testID = 'manage-card-list-item',
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors, descriptionOrientation);

  return (
    <TouchableOpacity onPress={onPress} {...generateTestId(Platform, testID)}>
      <ListItem style={styles.root}>
        <ListItemColumn widthType={WidthType.Fill} style={styles.description}>
          <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
          {typeof description === 'string' ? (
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {description}
            </Text>
          ) : (
            description
          )}
        </ListItemColumn>
        {(isLoading || rightIcon) && (
          <ListItemColumn>
            {isLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              rightIcon && (
                <Icon
                  style={styles.action}
                  size={IconSize.Md}
                  name={rightIcon}
                />
              )
            )}
          </ListItemColumn>
        )}
      </ListItem>
    </TouchableOpacity>
  );
};

export default ManageCardListItem;
