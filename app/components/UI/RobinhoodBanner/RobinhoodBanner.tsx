import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { Theme } from '../../../util/theme/models';
import { strings } from '../../../../locales/i18n';
import robinhoodIcon from '../../../images/robinhood.png';
import { NetworkToCaipChainId } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import Routes from '../../../constants/navigation/Routes';
import {
  ROBINHOOD_EXPLORE_BANNER_DISMISSED,
  ROBINHOOD_SWAPS_BANNER_DISMISSED,
} from '../../../constants/storage';
import StorageWrapper from '../../../store/storage-wrapper';
import { TokenDetailsSource } from '../TokenDetails/constants/constants';

export const ROBINHOOD_BANNER_TEST_ID = 'robinhood-banner';
export const ROBINHOOD_BANNER_DISMISS_TEST_ID = 'robinhood-banner-dismiss';

/** Screen the banner is rendered on. Each surface dismisses independently. */
export enum RobinhoodBannerSurface {
  Swaps = 'swaps',
  ExploreCrypto = 'explore-crypto',
}

const SURFACE_CONFIG: Record<
  RobinhoodBannerSurface,
  { storageKey: string; tokenDetailsSource: TokenDetailsSource }
> = {
  [RobinhoodBannerSurface.Swaps]: {
    storageKey: ROBINHOOD_SWAPS_BANNER_DISMISSED,
    tokenDetailsSource: TokenDetailsSource.BannerRobinhoodSwaps,
  },
  [RobinhoodBannerSurface.ExploreCrypto]: {
    storageKey: ROBINHOOD_EXPLORE_BANNER_DISMISSED,
    tokenDetailsSource: TokenDetailsSource.BannerRobinhoodExplore,
  },
};

export function useRobinhoodBanner(surface: RobinhoodBannerSurface) {
  const { storageKey, tokenDetailsSource } = SURFACE_CONFIG[surface];
  const navigation = useNavigation<AppNavigationProp>();
  const [isDismissed, setIsDismissed] = useState(
    () => StorageWrapper.getItemSync(storageKey) === 'true',
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    StorageWrapper.setItem(storageKey, 'true').catch(() => undefined);
  }, [storageKey]);

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
      initialNetwork: [NetworkToCaipChainId.ROBINHOOD],
      tokenDetailsSource,
    });
  }, [navigation, tokenDetailsSource]);

  return {
    dismiss,
    handlePress,
    shouldShow: !isDismissed,
  };
}

interface RobinhoodBannerProps {
  onDismiss: () => void;
  onPress: () => void;
}

const ICON_SIZE = 40;
const ICON_SCALE = 1.2;

const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      minHeight: 72,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.background.muted,
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageContainer: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: ICON_SIZE / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    image: {
      width: ICON_SIZE * ICON_SCALE,
      height: ICON_SIZE * ICON_SCALE,
    },
    copyContainer: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      minWidth: 0,
    },
    dismissButton: {
      marginLeft: 8,
    },
  });

export function RobinhoodBanner({ onDismiss, onPress }: RobinhoodBannerProps) {
  const { styles } = useStyles(createStyles, {});

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
      testID={ROBINHOOD_BANNER_TEST_ID}
    >
      <View style={styles.imageContainer}>
        <Image source={robinhoodIcon} resizeMode="cover" style={styles.image} />
      </View>
      <View style={styles.copyContainer}>
        <View style={styles.titleRow}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            style={styles.title}
          >
            {strings('bridge.robinhood_banner_title')}
          </Text>
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Sm}
            onPress={onDismiss}
            iconProps={{ color: IconColor.IconDefault }}
            style={styles.dismissButton}
            testID={ROBINHOOD_BANNER_DISMISS_TEST_ID}
          />
        </View>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {strings('bridge.robinhood_banner_subtitle')}
        </Text>
      </View>
    </Pressable>
  );
}
