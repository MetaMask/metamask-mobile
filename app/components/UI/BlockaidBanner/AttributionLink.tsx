import { useTheme } from '@react-navigation/native';
import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import Text from '../../../component-library/components/Texts/Text/Text';

const createStyles = (colors: any) =>
  StyleSheet.create({
    attributionLink: { color: colors.primary.default },
  });

const AttributionLink = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Text
      suppressHighlighting
      style={styles.attributionLink}
      variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
      onPress={() => {
        Linking.openURL(strings('blockaid_banner.attribution_link'));
      }}
    >
      {strings('blockaid_banner.attribution_link_name')}
    </Text>
  );
};

export default AttributionLink;
