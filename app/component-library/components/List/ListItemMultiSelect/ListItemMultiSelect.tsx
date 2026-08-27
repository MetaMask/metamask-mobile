/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';
import Pressable, {
  PressableVariant,
} from '../../../components-temp/Pressable';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelect.styles';
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';
import { DEFAULT_LISTITEMMULTISELECT_GAP } from './ListItemMultiSelect.constants';

/**
 * @deprecated This component is deprecated and will be removed in a future release.
 * Please use the ListItemMultiSelect component from @metamask/design-system-react-native instead.
 * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/ListItemMultiSelect | Component Source}
 */
const ListItemMultiSelect: React.FC<ListItemMultiSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LISTITEMMULTISELECT_GAP,
  onPress,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });

  return (
    <Pressable
      variant={PressableVariant.Highlight}
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <View pointerEvents={'none'}>
          <Checkbox
            style={styles.checkbox}
            isChecked={isSelected}
            isDisabled={isDisabled}
          />
        </View>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </Pressable>
  );
};

export default ListItemMultiSelect;
