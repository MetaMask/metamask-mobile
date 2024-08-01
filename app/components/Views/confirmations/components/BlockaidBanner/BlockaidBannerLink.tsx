import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import { useTheme } from '../../../../../util/theme';

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
  onContactUsClicked?: () => Promise<void> | void;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handlePress = async () => {
    if (onContactUsClicked) {
      await onContactUsClicked();
    }
    Linking.openURL(link);
  };

  return (
    <Text
      suppressHighlighting
      style={styles.attributionLink}
      variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
      onPress={handlePress}
    >
      {text}
    </Text>
  );
};

export default BlockaidBannerLink;
