import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { isWebUri } from 'valid-url';
import Text, {
  TextVariants,
} from '../../../component-library/components/Texts/Text';
import SelectComponent from '../../UI/SelectComponent';
import Engine from '../../../core/Engine';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './styles';
import Icon, { IconName } from '../../../component-library/components/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import { TEST_NETWORK_IMAGE_URL } from '../../../component-library/components/Toast/Toast.constants';
import NetworkList from '../../../util/networks';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ButtonSecondaryVariants } from '../../../component-library/components/Buttons/Button/variants/ButtonSecondary';

function getAdvancedPrivacyNavbarOptions(
  route,
  { headerLeft } = {},
  themeColors,
) {
  const headerLeftHide = headerLeft || route.params?.headerLeft;
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: themeColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 122,
      height: 15,
      tintColor: themeColors.text.default,
    },
  });

  return {
    headerStyle: innerStyles.headerStyle,
    headerTitle: () => (
      <Text variant={TextVariants.lHeadingSM}>Avanced Privacy Settings</Text>
    ),
    headerBackTitle: strings('navigation.back'),
    // headerRight: () => <View />,
    headerLeft: headerLeftHide,
    headerTintColor: themeColors.primary.default,
  };
}

const AdvancedPrivacySettings = () => {
  const [isInvalidIpfs, setIsInvalidIpfs] = useState(false);
  const [ipfs, setIpfs] = useState<string>('');
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { colors } = useTheme();

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getAdvancedPrivacyNavbarOptions(
        'Advanced Privacy Settings',
        navigation,
        colors,
      ),
    );
  }, [colors, navigation]);

  const ipfsGateway = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.ipfsGateway,
  );
  const provider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  useEffect(() => {
    updateNavBar();
    setIpfs(ipfsGateway);
  }, [updateNavBar, ipfsGateway, provider.chainId]);

  const onChangeIpfs = (ipfsGatewayText: string) => {
    const { PreferencesController } = Engine.context;

    setIpfs(ipfsGatewayText);
    if (!isWebUri(ipfsGatewayText)) {
      setIsInvalidIpfs(true);
      !ipfsGatewayText.length &&
        PreferencesController.setIpfsGateway(ipfsGateway);
      return;
    }
    setIsInvalidIpfs(false);
    PreferencesController.setIpfsGateway(ipfsGatewayText);
  };

  const onNavigateToAddNetwork = () => {
    navigation.navigate('NetworkSettings', { initialPage: 1 });
  };

  return (
    <ScrollView style={styles.scrollViewContainer}>
      <Text style={styles.thirdPartyText}>
        {strings('advanced_privacy_settings.third_party_services')}
      </Text>
      <Text variant={TextVariants.lHeadingSM} style={styles.customEthTitle}>
        Custom Ethereum access
      </Text>
      <Text variant={TextVariants.lBodySM}>
        {strings('advanced_privacy_settings.rpc_provider_description')}
      </Text>
      {/*  <Pressable style={styles.selectInput} onPress={() => console.log('')}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Avatar
            variant={AvatarVariants.Network}
            size={AvatarSize.Xs}
            name={'teste'}
            imageSource={{ uri: TEST_NETWORK_IMAGE_URL }}
          />
          <Text style={styles.label} variant={TextVariants.sBodyMD}>
            {NetworkList[provider.type].name}
          </Text>
        </View>
        <Icon name={IconName.ArrowDownOutline} color={colors.icon.default} />
      </Pressable> */}
      <Button
        variant={ButtonVariants.Secondary}
        buttonSecondaryVariants={ButtonSecondaryVariants.Normal}
        onPress={onNavigateToAddNetwork}
        label={'Add custom network'}
        size={ButtonSize.Lg}
        style={styles.addCustomNetwork}
      />
      <Text variant={TextVariants.lHeadingSM}>
        {strings('advanced_privacy_settings.ipfs_gateway_title')}
      </Text>
      <Text variant={TextVariants.lBodySM}>
        {strings('advanced_privacy_settings.ipfs_gateway_description')}
      </Text>
      <TextInput
        onChangeText={onChangeIpfs}
        value={ipfs}
        style={styles.input}
      />
      {isInvalidIpfs && (
        <Text variant={TextVariants.lBodyXS} style={styles.validUrlText}>
          {strings('advanced_privacy_settings.invalid_url')}
        </Text>
      )}
    </ScrollView>
  );
};
export default AdvancedPrivacySettings;
