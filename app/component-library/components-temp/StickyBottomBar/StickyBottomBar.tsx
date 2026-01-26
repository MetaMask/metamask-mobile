import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../component-library/hooks';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { StickyBottomBarProps } from './StickyBottomBar.types';
import styleSheet from './StickyBottomBar.styles';

const StickyBottomBar: React.FC<StickyBottomBarProps> = ({
  buttons,
  style,
  testID = 'sticky-bottom-bar',
}) => {
  const { styles } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();

  // Don't render if no buttons
  if (!buttons || buttons.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + 16 }, // SafeArea + padding
        style,
      ]}
      testID={testID}
    >
      <View style={styles.buttonRow}>
        {buttons.map((buttonProps, index) => (
          <View key={index} style={styles.buttonWrapper}>
            <Button
              {...buttonProps}
              variant={ButtonVariants.Primary}
              style={[styles.button, buttonProps.style]}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export default StickyBottomBar;
