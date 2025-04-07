///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { LinkChildren } from '@metamask/snaps-sdk/jsx';
import React from 'react';
import { TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

const styles = StyleSheet.create({
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spacer: {
    width: 4,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});

export interface SnapUILinkProps {
  children: LinkChildren;
  href: string;
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
export const SnapUILink: React.FC<SnapUILinkProps> = ({ href, children }) => (
  <TouchableOpacity
    testID="snaps-ui-link"
    style={styles.linkContainer}
    onPress={() => onPress(href)}
    accessibilityRole="link"
    accessibilityHint={`Opens ${href} in your browser`}
  >
    {children}
    <Icon
      name={IconName.Export}
      color={IconColor.Primary}
      size={IconSize.Sm}
      style={styles.icon}
    />
  </TouchableOpacity>
);

///: END:ONLY_INCLUDE_IF
