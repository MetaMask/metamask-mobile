import React, { useCallback, useRef, useContext } from 'react';
import { Linking, View } from 'react-native';
import Text, {
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

import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { TRANSAK_SUPPORT_URL } from '../../../constants/constants';
import { useDepositSDK } from '../../../sdk';
import { useNavigation } from '@react-navigation/native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../../component-library/components/Toast';
import Logger from '../../../../../../../util/Logger';

interface MenuItemProps {
  iconName: IconName;
  title: string;
  onPress: () => void;
}

function MenuItem({ iconName, title, onPress }: MenuItemProps) {
  const { theme } = useStyles(styleSheet, {});

  return (
    <ListItemSelect
      isSelected={false}
      onPress={onPress}
      accessibilityRole="button"
      accessible
    >
      <ListItemColumn widthType={WidthType.Auto}>
        <Icon
          name={iconName}
          size={IconSize.Md}
          color={theme.colors.icon.default}
        />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyLGMedium}>{title}</Text>
      </ListItemColumn>
    </ListItemSelect>
  );
}

function ConfigurationModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});
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

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <View style={styles.container}>
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
      </View>
    </BottomSheet>
  );
}

export default ConfigurationModal;
