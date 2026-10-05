import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Theme } from '@metamask/design-tokens';
import {
  Box,
  BoxFlexDirection,
  HeaderSubpage,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks/useStyles';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type {
  TokenDetailsRouteParams,
  TokenDetailsVariant,
} from '../constants/constants';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import { useTokenStatBarStats } from '../hooks/useTokenStatBarStats';
import SecuritySocialSection from '../components/V1/SecuritySocialSection/SecuritySocialSection';
import StatBar from '../components/V1/StatBar/StatBar';
import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';

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
  });
};

interface TokenDetailsV1Props {
  token: TokenDetailsRouteParams;
  /** Asset category this page renders for, which decides the stat bar's stats. */
  variant: TokenDetailsVariant;
}

export const TokenDetailsV1: React.FC<TokenDetailsV1Props> = ({
  token,
  variant,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();

  const assetId = useTokenCaipAssetId(token);
  // Rows that navigate here (watchlist, trending, search) already hold this
  // payload, so the hook skips the fetch and the links render on first paint.
  const { securityData } = useTokenSecurityData({
    assetId,
    prefetchedData: token.securityData,
  });

  const statBarStats = useTokenStatBarStats();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // TODO(ASSETS-4019): open the explainer bottom sheet for the tapped stat.
  // The labels are already buttons so the press target and its accessibility
  // label do not need revisiting when the sheet lands.
  const handleStatPress = useCallback(() => undefined, []);

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

      {/* Owns the page gutter and the spacing between sections, so sections
          render content only and never their own page padding. Full-bleed
          sections sit outside it and supply their own horizontal padding. */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="gap-4 px-4 pt-2 pb-4"
      >
        <SecuritySocialSection
          securityVerdict={MOCK_SECURITY_VERDICT}
          securityFlagCount={MOCK_SECURITY_FLAG_COUNT}
          externalLinks={securityData?.metadata?.externalLinks}
          contractAddress={token.isNative ? null : token.address}
        />
      </Box>

      {/* Outside the gutter so its rules span the full width. */}
      <StatBar
        variant={variant}
        stats={statBarStats}
        onStatPress={handleStatPress}
      />
    </View>
  );
};

export default TokenDetailsV1;
