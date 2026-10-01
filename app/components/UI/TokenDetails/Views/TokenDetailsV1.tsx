import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Theme } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  HeaderSubpage,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks/useStyles';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { TokenDetailsRouteParams } from '../constants/constants';

export const TOKEN_DETAILS_V1_TEST_ID = 'token-details-v1';

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
}

export const TokenDetailsV1: React.FC<TokenDetailsV1Props> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.wrapper} testID={TOKEN_DETAILS_V1_TEST_ID}>
      <HeaderSubpage title={token.symbol ?? ''} onBack={handleBackPress} />

      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 gap-2 px-6"
      >
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          Dedicated meme coin view
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {`A tailored experience for ${
            token.symbol ?? 'this token'
          } is being built. Check back soon.`}
        </Text>
      </Box>
    </View>
  );
};

export default TokenDetailsV1;
