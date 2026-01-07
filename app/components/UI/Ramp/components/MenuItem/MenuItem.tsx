import React from 'react';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './MenuItem.styles';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

interface MenuItemProps {
  iconName: IconName;
  title: string;
  description?: string;
  onPress: () => void;
}

export default function MenuItem({
  iconName,
  title,
  description,
  onPress,
}: MenuItemProps) {
  const { theme, styles } = useStyles(styleSheet, {});

  return (
    <ListItemSelect
      isSelected={false}
      onPress={onPress}
      listItemProps={{
        style: styles.listItem,
      }}
    >
      <ListItemColumn widthType={WidthType.Auto}>
        <Icon
          name={iconName}
          size={IconSize.Md}
          color={theme.colors.icon.default}
        />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
        {description && (
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {description}
          </Text>
        )}
      </ListItemColumn>
    </ListItemSelect>
  );
}
