import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../util/networks';
import { MUSD_TOKEN } from '../constants/musd';
import { strings } from '../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    gap: 8,
  },
  tokenIcon: {
    width: 16,
    height: 16,
  },
  badgeWrapper: {
    alignSelf: 'center',
  },
  headerLeft: {
    marginHorizontal: 8,
  },
});

/**
 * Hook that sets up the mUSD conversion navbar with custom styling.
 * Uses the centralized rejection logic from useNavbar.
 *
 * @param chainId - Chain ID for the network badge
 */
export function useMusdConversionNavbar(chainId: string) {
  const networkImageSource = getNetworkImageSource({ chainId });

  const renderHeaderTitle = useCallback(
    () => (
      <View style={styles.headerTitle}>
        <BadgeWrapper
          style={styles.badgeWrapper}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
            />
          }
        >
          <Image
            source={MUSD_TOKEN.imageSource}
            style={styles.tokenIcon}
            testID="musd-token-icon"
          />
        </BadgeWrapper>
        <Text variant={TextVariant.BodyMDBold}>
          {strings('earn.musd_conversion.convert_to_musd')}
        </Text>
      </View>
    ),
    [networkImageSource],
  );

  const renderHeaderLeft = useCallback(
    (onBackPress: () => void) => (
      <View style={styles.headerLeft}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Lg}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onBackPress}
        />
      </View>
    ),
    [],
  );

  const overrides = useMemo(
    () => ({
      headerTitle: renderHeaderTitle,
      headerLeft: renderHeaderLeft,
    }),
    [renderHeaderTitle, renderHeaderLeft],
  );

  useNavbar(strings('earn.musd_conversion.convert_to_musd'), true, overrides);
}
