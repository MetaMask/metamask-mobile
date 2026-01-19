import React, { useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import { isEvmAccountType } from '@metamask/keyring-api';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import SmartAccountNetworkList from '../SmartAccountNetworkList/SmartAccountNetworkList';
import styleSheet from './SmartAccountModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootParamList } from '../../../../../../types/navigation';
import { SwitchAccountModalSelectorIDs } from '../../../../../../components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
import AppConstants from '../../../../../../core/AppConstants';
import HeaderBase from '../../../../../../component-library/components/HeaderBase';
import ButtonLink from '../../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

type SmartAccountModalProp = RouteProp<RootParamList, 'SmartAccount'>;

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
    <SafeAreaView style={styles.safeArea} testID="smart-account-safe-area">
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
            testID={SwitchAccountModalSelectorIDs.SMART_ACCOUNT_BACK_BUTTON}
          />
        }
      >
        {strings('multichain_accounts.account_details.smart_account')}
      </HeaderBase>
      <View style={styles.container}>
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
