import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
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
}

const ManageCardListItem: React.FC<ManageCardListItemProps> = ({
  title,
  onPress,
  description,
  descriptionOrientation = 'column',
  rightIcon = IconName.ArrowRight,
  testID = 'manage-card-list-item',
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
        <ListItemColumn>
          <Icon style={styles.action} size={IconSize.Md} name={rightIcon} />
        </ListItemColumn>
      </ListItem>
    </TouchableOpacity>
  );
};

export default ManageCardListItem;
