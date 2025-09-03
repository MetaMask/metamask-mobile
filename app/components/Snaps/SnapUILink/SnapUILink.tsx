///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React from 'react';
import {
  Text,
  StyleSheet,
  Linking,
  View,
  TouchableOpacity,
} from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  spacer: {
    width: 4,
  },
});

export interface SnapUILinkProps {
  children: React.ReactNode;
  href: string;
  isInline?: boolean;
}

const validateUrl = (href: string) => {
  if (!href.startsWith('https://')) {
    throw new Error('Invalid URL');
  }
};

const onPress = (href: string) => {
  validateUrl(href);
  Linking.openURL(href);
};

// TODO: This component should show a modal for links when not using preinstalled Snaps
export const SnapUILink: React.FC<SnapUILinkProps> = ({
  href,
  children,
  isInline,
}) => {
  const Component = isInline ? Text : TouchableOpacity;

  return (
    <Component
      testID="snaps-ui-link"
      style={styles.container}
      onPress={() => onPress(href)}
      accessibilityRole="link"
      accessibilityHint={strings('snaps.snap_ui.link.accessibilityHint')}
    >
      {children}
      <View style={styles.spacer} />
      <Icon
        name={IconName.Export}
        color={IconColor.Primary}
        size={IconSize.Sm}
        testID="snaps-ui-link-icon"
      />
    </Component>
  );
};

///: END:ONLY_INCLUDE_IF
