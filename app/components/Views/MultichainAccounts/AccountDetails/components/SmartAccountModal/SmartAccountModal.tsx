import React, { useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FontWeight,
  HeaderBase,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isEvmAccountType } from '@metamask/keyring-api';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import SmartAccountNetworkList from '../SmartAccountNetworkList/SmartAccountNetworkList';
import styleSheet from './SmartAccountModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { SwitchAccountModalSelectorIDs } from '../../../../../../components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
import AppConstants from '../../../../../../core/AppConstants';
import { SMART_ACCOUNT_MODAL_TEST_IDS } from './SmartAccountModal.testIds';

const HEADER_BASE_TITLE_TEST_ID = 'header-title';

interface RootNavigationParamList extends ParamListBase {
  SmartAccount: {
    account: InternalAccount;
  };
}

type SmartAccountModalProp = RouteProp<RootNavigationParamList, 'SmartAccount'>;

const SmartAccountModal = () => {
  const route = useRoute<SmartAccountModalProp>();
  const { account } = route.params;
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  // Delay rendering NetworkList until after initial layout
  const [showNetworkList, setShowNetworkList] = useState(false);

  useLayoutEffect(() => {
    // Render network list after layout is stable
    const timer = setTimeout(() => setShowNetworkList(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleLearnMore = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.SMART_ACCOUNTS,
        title: 'Smart Accounts',
      },
    });
  };

  if (!isEvmAccountType(account.type)) {
    return null;
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      testID={SMART_ACCOUNT_MODAL_TEST_IDS.SAFE_AREA}
    >
      <HeaderBase
        style={styles.header}
        titleTestID={HEADER_BASE_TITLE_TEST_ID}
        startButtonIconProps={{
          testID: SwitchAccountModalSelectorIDs.SMART_ACCOUNT_BACK_BUTTON,
          iconName: IconName.ArrowLeft,
          onPress: () => navigation.goBack(),
        }}
      >
        {strings('multichain_accounts.account_details.smart_account')}
      </HeaderBase>
      <View style={styles.container}>
        <View
          style={styles.contentContainer}
          testID={SMART_ACCOUNT_MODAL_TEST_IDS.CONTAINER}
        >
          <Box style={styles.cardContainer}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('multichain_accounts.smart_account.title')}
            </Text>
            <Box
              style={styles.description}
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.flexStart}
            >
              <Text variant={TextVariant.BodyMd}>
                {strings('multichain_accounts.smart_account.description')}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.InfoDefault}
                  onPress={handleLearnMore}
                >
                  {strings('multichain_accounts.smart_account.learn_more')}
                </Text>
              </Text>
            </Box>
            {showNetworkList && (
              <SmartAccountNetworkList address={account.address} />
            )}
          </Box>
        </View>
      </View>
    </SafeAreaView>
  );
};

export { SmartAccountModal };
