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
import { useStyles } from '../../../../../component-library/hooks';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { Theme } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';
import robinhoodIcon from '../../../../../images/robinhood.png';
import { NetworkToCaipChainId } from '../../../NetworkMultiSelector/NetworkMultiSelector.constants';
import Routes from '../../../../../constants/navigation/Routes';
import { ROBINHOOD_SWAPS_BANNER_DISMISSED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';

export const ROBINHOOD_SWAPS_BANNER_TEST_ID = 'robinhood-swaps-banner';
export const ROBINHOOD_SWAPS_BANNER_DISMISS_TEST_ID =
  'robinhood-swaps-banner-dismiss';

const getIsRobinhoodSwapsBannerDismissed = () =>
  StorageWrapper.getItemSync(ROBINHOOD_SWAPS_BANNER_DISMISSED) === 'true';

export function useRobinhoodSwapsBanner() {
  const navigation = useNavigation<AppNavigationProp>();
  const [isDismissed, setIsDismissed] = useState(
    getIsRobinhoodSwapsBannerDismissed,
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    StorageWrapper.setItem(ROBINHOOD_SWAPS_BANNER_DISMISSED, 'true').catch(
      () => undefined,
    );
  }, []);

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
      initialNetwork: [NetworkToCaipChainId.ROBINHOOD],
      tokenDetailsSource: TokenDetailsSource.BannerRobinhoodSwaps,
    });
  }, [navigation]);

  return {
    dismiss,
    handlePress,
    shouldShow: !isDismissed,
  };
}

interface RobinhoodSwapsBannerProps {
  onDismiss: () => void;
  onPress: () => void;
}

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
      width: 46,
      height: 46,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.primary.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    image: {
      width: 40,
      height: 40,
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

export function RobinhoodSwapsBanner({
  onDismiss,
  onPress,
}: RobinhoodSwapsBannerProps) {
  const { styles } = useStyles(createStyles, {});

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
      testID={ROBINHOOD_SWAPS_BANNER_TEST_ID}
    >
      <View style={styles.imageContainer}>
        <Image
          source={robinhoodIcon}
          resizeMode="contain"
          style={styles.image}
        />
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
            testID={ROBINHOOD_SWAPS_BANNER_DISMISS_TEST_ID}
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
