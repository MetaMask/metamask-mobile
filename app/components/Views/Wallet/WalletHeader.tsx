import React, { memo, useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  SelectButton,
  SelectButtonVariant,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import {
  type NavigationProp,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';

import AddressCopy from '../../UI/AddressCopy';
import CardButton from '../../UI/Card/components/CardButton';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../AccountSelector';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useAccountGroupName } from '../../hooks/multichainAccounts/useAccountGroupName';
import { useAccountName } from '../../hooks/useAccountName';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectMoneyEnableMoneyAccountFlag } from '../../UI/Money/selectors/featureFlags';
import { WalletViewSelectorsIDs } from './WalletView.testIds';

const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

interface WalletHeaderProps {
  onLayout?: (e: LayoutChangeEvent) => void;
}

const WalletHeader = ({ onLayout }: WalletHeaderProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { trackEvent } = useAnalytics();

  const accountName = useAccountName();
  const accountGroupName = useAccountGroupName();
  const displayName = accountGroupName || accountName;

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);

  const hasBadge =
    isNotificationsFeatureEnabled() &&
    isNotificationEnabled &&
    unreadNotificationCount > 0;

  const handleHamburgerPress = useCallback(() => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS,
      )
        .addProperties({ action: 'Navigation Drawer', name: 'Settings' })
        .build(),
    );
    navigation.navigate(Routes.SETTINGS_VIEW);
  }, [navigation, trackEvent]);

  const handleCardPress = useCallback(() => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CARD_HOME_CLICKED,
      ).build(),
    );
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation, trackEvent]);

  const handleActivityPress = useCallback(() => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ACTIVITY_CLICKED,
      ).build(),
    );
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [navigation, trackEvent]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="pl-2 pr-3 py-2"
      testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
      onLayout={onLayout}
    >
      <SelectButton
        placeholder=""
        value={displayName}
        variant={SelectButtonVariant.Secondary}
        onPress={() =>
          navigation.navigate(...createAccountSelectorNavDetails({}))
        }
        testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
        hitSlop={TOUCH_SLOP}
        textProps={{
          variant: TextVariant.BodyMd,
          fontWeight: FontWeight.Medium,
          ellipsizeMode: 'tail',
        }}
      />

      {isMoneyAccountEnabled && (
        <ButtonIcon
          iconProps={{ color: IconColor.IconDefault }}
          onPress={handleActivityPress}
          iconName={IconName.Clock}
          size={ButtonIconSize.Md}
          testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
          hitSlop={TOUCH_SLOP}
          twClassName="ml-auto"
        />
      )}
      <AddressCopy
        testID={WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON}
        hitSlop={TOUCH_SLOP}
      />
      <CardButton onPress={handleCardPress} touchAreaSlop={TOUCH_SLOP} />
      <BadgeWrapper
        position={BadgeWrapperPosition.TopRight}
        positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
        badge={
          hasBadge ? <BadgeStatus status={BadgeStatusStatus.Attention} /> : null
        }
      >
        <ButtonIcon
          iconProps={{ color: IconColor.IconDefault }}
          onPress={handleHamburgerPress}
          iconName={IconName.Menu}
          size={ButtonIconSize.Md}
          testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON}
          hitSlop={TOUCH_SLOP}
        />
      </BadgeWrapper>
    </Box>
  );
};

export default memo(WalletHeader);
