import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import CardAssetList from '../../UI/Card/CardAssetList/CardAssetList';
import Logger from '../../../util/Logger';
import { useSelector } from 'react-redux';
import { selectCardFeature } from '../../../selectors/featureFlagController/card';
import {
  fetchSupportedTokensBalances,
  mapTokenBalancesToTokenKeys,
  TokenConfig,
} from '../../UI/Card/card.utils';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../core/Engine';
import { useTheme } from '../../../util/theme';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import createStyles, { headerStyle } from './styles';
import { TokenListItem } from '../../UI/Tokens/TokenList/TokenListItem';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Loader from '../../../component-library/components-temp/Loader';

const CardView = () => {
  const { PreferencesController } = Engine.context;
  const [refreshing, setRefreshing] = useState(false);
  const privacyMode = useSelector(selectPrivacyMode);
  const theme = useTheme();
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const cardFeature = useSelector(selectCardFeature);
  const [supportedTokenBalances, setSupportedTokenBalances] = useState<{
    tokenConfigs: TokenConfig[];
    totalBalanceDisplay: string;
  } | null>(null);
  const itemHeight = 130;
  const { width: deviceWidth } = Dimensions.get('window');
  const styles = createStyles(theme, itemHeight, deviceWidth);

  const selectedTokenKey = useMemo(() => {
    if (!supportedTokenBalances) {
      return null;
    }

    return mapTokenBalancesToTokenKeys(
      supportedTokenBalances.tokenConfigs,
      theme.colors,
    )[0];
  }, [supportedTokenBalances, theme]);

  const refreshTokens = useCallback(async () => {
    setRefreshing(true);

    if (!cardFeature) {
      throw new Error('Card feature is not enabled');
    }

    if (selectedAddress) {
      const { balanceList, totalBalanceDisplay } =
        await fetchSupportedTokensBalances(selectedAddress, cardFeature);

      setSupportedTokenBalances({
        tokenConfigs: balanceList,
        totalBalanceDisplay,
      });

      setRefreshing(false);
    }
  }, [selectedAddress, cardFeature]);

  useEffect(() => {
    const fetchBalances = async () => {
      await refreshTokens();
    };

    fetchBalances();
  }, [refreshTokens]);

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  if (refreshing) {
    return (
      <View style={styles.wrapper}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.defaultPadding}>
        <View style={styles.balanceContainer}>
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.HeadingLG}
          >
            {supportedTokenBalances?.tokenConfigs[0]?.balance
              ? `${supportedTokenBalances?.tokenConfigs[0]?.balance} ${supportedTokenBalances?.tokenConfigs[0]?.symbol}`
              : '0'}
          </SensitiveText>
          <TouchableOpacity
            onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
            testID="balance-container"
          >
            <Icon
              style={styles.privacyIcon}
              name={privacyMode ? IconName.EyeSlash : IconName.Eye}
              size={IconSize.Md}
              color={theme.colors.text.muted}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.spendingWithContainer}>
          <Text
            variant={TextVariant.HeadingMD}
            style={styles.spendingWithTitle}
          >
            Spending with
          </Text>
          {selectedTokenKey && (
            <View style={styles.spendingWith}>
              <TokenListItem
                assetKey={selectedTokenKey}
                showRemoveMenu={() => {}}
                setShowScamWarningModal={() => {}}
                privacyMode={privacyMode}
                showPercentageChange={false}
              />
              <Button
                variant={ButtonVariants.Secondary}
                label="Add funds"
                size={ButtonSize.Md}
                onPress={() => {
                  Logger.log('Add funds button pressed');
                }}
                width={ButtonWidthTypes.Full}
              />
            </View>
          )}

          <BannerAlert
            severity={BannerAlertSeverity.Info}
            description="To switch the token you spend from, see transaction history, you’ll need to login to your card account."
          />
        </View>

        <Text
          variant={TextVariant.HeadingMD}
          testID={'card-view-balance-title'}
        >
          Other Assets
        </Text>
      </View>
      <CardAssetList
        tokenBalances={supportedTokenBalances?.tokenConfigs || []}
        refreshing={refreshing}
        onRefresh={refreshTokens}
      />
    </View>
  );
};

export default CardView;

CardView.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSizes.Md}
      iconName={IconName.Close}
      onPress={() => navigation.navigate(Routes.WALLET.HOME)}
    />
  ),
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingMD}
      style={headerStyle.title}
      testID={'card-view-title'}
    >
      Card
    </Text>
  ),
  headerRight: () => (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.Setting}
      style={headerStyle.icon}
    />
  ),
});
