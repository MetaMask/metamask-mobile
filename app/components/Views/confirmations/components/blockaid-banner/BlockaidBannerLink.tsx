import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { Text, TextVariant } from '@metamask/design-system-react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    attributionLink: { color: colors.primary.default },
  });

const BlockaidBannerLink = ({
  text,
  link,
  onContactUsClicked,
}: {
  text: string;
  link: string;
  onContactUsClicked?: () => void | undefined;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Text
      suppressHighlighting
      style={styles.attributionLink}
      variant={TextVariant.BodySm}
      onPress={() => {
        onContactUsClicked?.();
        Linking.openURL(link);
      }}
    >
      {text}
    </Text>
  );
};

export default BlockaidBannerLink;
