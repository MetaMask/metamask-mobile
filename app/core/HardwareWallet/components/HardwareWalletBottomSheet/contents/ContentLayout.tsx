import React from 'react';
import { View, StyleSheet } from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

export const CONTENT_LAYOUT_TEST_ID = 'content-layout';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainerNoIcon: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  title: {
    textAlign: 'center',
  },
  bodyContainer: {
    marginBottom: 0,
  },
  footerContainer: {
    marginTop: 16,
    width: '100%',
    gap: 8,
  },
});

export interface ContentLayoutProps {
  /** Icon element rendered at the top */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Optional body content rendered between title and footer */
  body?: React.ReactNode;
  /** Optional footer content (buttons, spinners, etc.) */
  footer?: React.ReactNode;
  /** Optional testID override */
  testID?: string;
  /** Optional testID for the title Text element */
  titleTestID?: string;
}

/**
 * Shared layout skeleton for all HardwareWalletBottomSheet content components.
 */
export const ContentLayout: React.FC<ContentLayoutProps> = ({
  icon,
  title,
  body,
  footer,
  testID = CONTENT_LAYOUT_TEST_ID,
  titleTestID,
}) => (
  <View style={styles.container} testID={testID}>
    {icon && <View style={styles.iconContainer}>{icon}</View>}

    <View style={icon ? styles.titleContainer : styles.titleContainerNoIcon}>
      <Text
        testID={titleTestID}
        variant={TextVariant.HeadingMD}
        color={TextColor.Default}
        style={styles.title}
      >
        {title}
      </Text>
    </View>

    {body && <View style={styles.bodyContainer}>{body}</View>}

    {footer && <View style={styles.footerContainer}>{footer}</View>}
  </View>
);
