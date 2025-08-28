import React from 'react';
import { View, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import {
  EIP7702NetworkConfiguration,
  useEIP7702Networks,
} from '../../../../confirmations/hooks/7702/useEIP7702Networks';
import { InternalAccount } from '@metamask/keyring-internal-api';
import AccountNetworkRow from '../../../../confirmations/components/modals/switch-account-type-modal/account-network-row';
import { isEvmAccountType } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import styleSheet from './SmartAccountModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import AppConstants from '../../../../../../core/AppConstants';
import HeaderBase from '../../../../../../component-library/components/HeaderBase';
import ButtonLink from '../../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

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
  const {
    network7702List,
  }: { network7702List: EIP7702NetworkConfiguration[] } = useEIP7702Networks(
    account.address,
  );
  const navigation = useNavigation();

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
    <SafeAreaView style={styles.safeArea} testID="smart-account-safe-area">
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {strings('multichain_accounts.account_details.smart_account')}
      </HeaderBase>
      <ScrollView style={styles.container} testID="smart-account-scroll-view">
        <View style={styles.contentContainer} testID="smart-account-content">
          <Box style={styles.cardContainer}>
            <Text variant={TextVariant.BodyMDMedium}>
              {strings('multichain_accounts.smart_account.title')}
            </Text>
            <Box
              style={styles.description}
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.flexStart}
            >
              <Text>
                {strings('multichain_accounts.smart_account.description')}{' '}
                <Text color={TextColor.Info} onPress={handleLearnMore}>
                  {strings('multichain_accounts.smart_account.learn_more')}
                </Text>
              </Text>
            </Box>
          </Box>

          <FlatList
            style={styles.networkList}
            data={network7702List}
            keyExtractor={(item) => item.chainId}
            testID="network-flat-list"
            renderItem={({ item }) => (
              <AccountNetworkRow network={item} address={account.address as Hex} />
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export { SmartAccountModal };
