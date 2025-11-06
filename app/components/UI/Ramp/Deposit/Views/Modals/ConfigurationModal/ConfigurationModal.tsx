import React, { useCallback, useRef, useContext } from 'react';
import { Linking } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';

import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './ConfigurationModal.styles';

import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import { createBuyNavigationDetails } from '../../../../Aggregator/routes/utils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { TRANSAK_SUPPORT_URL } from '../../../constants/constants';
import { useDepositSDK } from '../../../sdk';
import { useNavigation } from '@react-navigation/native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../../component-library/components/Toast';
import Logger from '../../../../../../../util/Logger';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';

export const createConfigurationModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.CONFIGURATION,
  );

interface MenuItemProps {
  iconName: IconName;
  title: string;
  description?: string;
  onPress: () => void;
}

function MenuItem({ iconName, title, description, onPress }: MenuItemProps) {
  const { theme, styles } = useStyles(styleSheet, {});

  return (
    <ListItemSelect
      isSelected={false}
      onPress={onPress}
      listItemProps={{
        style: styles.listItem,
      }}
    >
      <ListItemColumn widthType={WidthType.Auto}>
        <Icon
          name={iconName}
          size={IconSize.Md}
          color={theme.colors.icon.default}
        />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
        {description && (
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {description}
          </Text>
        )}
      </ListItemColumn>
    </ListItemSelect>
  );
}

function ConfigurationModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);

  const { logoutFromProvider, isAuthenticated } = useDepositSDK();

  const navigateToOrderHistory = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  }, [navigation]);

  const handleContactSupport = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    Linking.openURL(TRANSAK_SUPPORT_URL);
  }, []);

  const handleNavigateToAggregator = useCallback(() => {
    navigation.dangerouslyGetParent()?.dangerouslyGetParent()?.goBack();
    navigation.navigate(...createBuyNavigationDetails());
  }, [navigation]);

  const handleLogOut = useCallback(async () => {
    try {
      await logoutFromProvider();

      sheetRef.current?.onCloseBottomSheet();
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('deposit.configuration_modal.logged_out_success') },
        ],
        iconName: IconName.CheckBold,
        iconColor: IconColor.Success,
        hasNoTimeout: false,
      });
    } catch (error) {
      Logger.error(error as Error, 'Error logging out from provider:');
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('deposit.configuration_modal.logged_out_error') },
        ],
        iconName: IconName.CircleX,
        iconColor: IconColor.Error,
        hasNoTimeout: false,
      });
    }
  }, [logoutFromProvider, toastRef]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClosePress}>Settings</BottomSheetHeader>
      <MenuItem
        iconName={IconName.Clock}
        title={strings('deposit.configuration_modal.view_order_history')}
        onPress={navigateToOrderHistory}
      />

      <MenuItem
        iconName={IconName.Messages}
        title={strings('deposit.configuration_modal.contact_support')}
        onPress={handleContactSupport}
      />

      {isAuthenticated && (
        <MenuItem
          iconName={IconName.Logout}
          title={strings('deposit.configuration_modal.log_out')}
          onPress={handleLogOut}
        />
      )}

      <MenuItem
        iconName={IconName.Money}
        title={strings('deposit.configuration_modal.more_ways_to_buy')}
        description={strings(
          'deposit.configuration_modal.more_ways_to_buy_description',
        )}
        onPress={handleNavigateToAggregator}
      />
    </BottomSheet>
  );
}

export default ConfigurationModal;
