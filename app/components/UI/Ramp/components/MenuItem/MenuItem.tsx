import React from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        {description && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {description}
          </Text>
        )}
      </ListItemColumn>
    </ListItemSelect>
  );
}
