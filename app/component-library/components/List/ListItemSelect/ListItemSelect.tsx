/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Pressable, {
  PressableVariant,
} from '../../../components-temp/Pressable';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemSelect.styles';
import { ListItemSelectProps } from './ListItemSelect.types';
import { DEFAULT_SELECTITEM_GAP } from './ListItemSelect.constants';

/**
 * @deprecated This component is deprecated and will be removed in a future release.
 * Please use the ListItemSelect component from @metamask/design-system-react-native instead.
 * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/ListItemSelect | Component Source}
 */
const ListItemSelect: React.FC<ListItemSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  onPress,
  onLongPress,
  gap = DEFAULT_SELECTITEM_GAP,
  verticalAlignment,
  listItemProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

  return (
    <Pressable
      variant={PressableVariant.Highlight}
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
      onLongPress={onLongPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem} {...listItemProps}>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </Pressable>
  );
};

export default ListItemSelect;
