/* eslint-disable arrow-body-style */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { getNavigationOptionsTitle } from '../../../Navbar';
import {
  fetchSupportedTokensBalances,
  TokenConfig,
} from '../PortfolioBalance/card.utils';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';

const CardBalance = () => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      zIndex: 99999999999999,
    },
    title: {
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    privacyIcon: {
      marginLeft: 8,
    },
    tokenList: {
      marginTop: 16,
    },
    tokenItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    tokenInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenDetails: {
      marginLeft: 12,
    },
    tokenSymbol: {
      fontWeight: 'bold',
    },
    tokenName: {
      color: colors.text.muted,
    },
    loaderWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer: {
      marginTop: 24,
    },
  });
  const navigation = useNavigation();
  // const selectedAddress = '0xFe4F94B62C04627C2677bF46FB249321594d0d79';
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { NetworkController } = Engine.context;
  const privacyMode = useSelector(selectPrivacyMode);
  const { PreferencesController } = Engine.context;

  const [supportedTokenBalances, setSupportedTokenBalances] = useState<{
    balanceList: TokenConfig[];
    totalBalanceDisplay: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      setIsLoading(true);

      if (selectedAddress) {
        const { balanceList, totalBalanceDisplay } =
          await fetchSupportedTokensBalances(selectedAddress);
        setSupportedTokenBalances({ balanceList, totalBalanceDisplay });
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [selectedAddress, NetworkController]);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('asset_overview.token_balances'),
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const renderTokenItem = (token: TokenConfig) => {
    return (
      <View key={token.address} style={styles.tokenItem}>
        <View style={styles.tokenInfo}>
          <Icon
            name={IconName.Coin}
            size={IconSize.Md}
            color={colors.icon.default}
          />
          <View style={styles.tokenDetails}>
            <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
              {token.symbol}
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.tokenName}>
              {token.name}
            </Text>
          </View>
        </View>
        <View>
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            variant={TextVariant.BodyMD}
          >
            {token.balance}
          </SensitiveText>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.loaderWrapper}>
          <Loader />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrapper}>
      <View style={styles.balanceContainer}>
        <SensitiveText
          isHidden={privacyMode}
          length={SensitiveTextLength.Long}
          variant={TextVariant.DisplayMD}
        >
          {supportedTokenBalances?.totalBalanceDisplay || 0}
        </SensitiveText>
        <TouchableOpacity
          onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
          testID="balance-container"
        >
          <Icon
            style={styles.privacyIcon}
            name={privacyMode ? IconName.EyeSlash : IconName.Eye}
            size={IconSize.Md}
            color={colors.text.muted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tokenList}>
        {supportedTokenBalances?.balanceList.map(renderTokenItem)}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Full}
          onPress={goBack}
          label={strings('navigation.back')}
          testID="card-balance-back-button-bottom"
        />
      </View>
    </ScrollView>
  );
};

export default CardBalance;
