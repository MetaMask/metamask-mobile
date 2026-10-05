import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Theme } from '@metamask/design-tokens';
import {
  Box,
  BoxFlexDirection,
  HeaderSubpage,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks/useStyles';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import SecuritySocialSection from '../components/V1/SecuritySocialSection/SecuritySocialSection';
import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';
import SocialFeed from '../../SocialFeed/components/SocialFeed';

export const TOKEN_DETAILS_V1_TEST_ID = 'token-details-v1';
export const TOKEN_DETAILS_V1_BACK_BUTTON_TEST_ID =
  'token-details-v1-back-button';

/**
 * TODO(ASSETS-4018): replace with the real verdict and flag count once
 * security data is available. Change these values locally to preview the other
 * states; the count is only rendered for `medium_risk`.
 */
const MOCK_SECURITY_VERDICT: SecurityVerdict = 'screened';
const MOCK_SECURITY_FLAG_COUNT = 1;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
  });
};

interface TokenDetailsV1Props {
  token: TokenDetailsRouteParams;
}

export const TokenDetailsV1: React.FC<TokenDetailsV1Props> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();

  const assetId = useTokenCaipAssetId(token);
  // Rows that navigate here (watchlist, trending, search) already hold this
  // payload, so the hook skips the fetch and the links render on first paint.
  const { securityData } = useTokenSecurityData({
    assetId,
    prefetchedData: token.securityData,
  });

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.wrapper} testID={TOKEN_DETAILS_V1_TEST_ID}>
      {/* Back button only. The full header (price, symbol, star / alert /
          share) is owned by a separate ticket. `includesTopInset` keeps the
          row clear of the status bar, matching TokenDetailsInlineHeader. */}
      <HeaderSubpage
        includesTopInset
        onBack={handleBackPress}
        backButtonProps={{ testID: TOKEN_DETAILS_V1_BACK_BUTTON_TEST_ID }}
      />

      {/* The security row uses the page gutter. SocialFeed pads its own
          list, so it sits outside that gutter and scrolls with the page. */}
      <ScrollView style={styles.scroll}>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-4 pt-2">
          <Box twClassName="px-4">
            <SecuritySocialSection
              securityVerdict={MOCK_SECURITY_VERDICT}
              securityFlagCount={MOCK_SECURITY_FLAG_COUNT}
              externalLinks={securityData?.metadata?.externalLinks}
              contractAddress={token.isNative ? null : token.address}
            />
          </Box>
          {assetId ? (
            <SocialFeed
              source={{ kind: 'token', assetId }}
              location="token_details"
            />
          ) : null}
        </Box>
      </ScrollView>
    </View>
  );
};

export default TokenDetailsV1;
