import React, { useCallback, useMemo } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Logger from '../../../../../util/Logger';
import { useSelector } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import createStyles, { headerStyle } from './styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Loader from '../../../../../component-library/components-temp/Loader';
import { ScreenshotDeterrent } from '../../../../UI/ScreenshotDeterrent';
import { TokenListItem } from '../../../Tokens/TokenList/TokenListItem';
import { mapTokenBalanceToTokenKey } from '../../sdk';
import { useCardTokenBalances, useUserLocation } from '../../hooks';
import CardAssetList from '../../components/CardAssetList/CardAssetList';

interface ICardHomeProps {
  navigation?: NavigationProp<ParamListBase>;
}

const CardHome = ({ navigation }: ICardHomeProps) => {
  const hasNavigation = Boolean(navigation);
  const { PreferencesController } = Engine.context;
  const privacyMode = useSelector(selectPrivacyMode);
  const theme = useTheme();
  const itemHeight = 130;
  const { width: deviceWidth } = Dimensions.get('window');
  const styles = createStyles(theme, itemHeight, deviceWidth);
  const {
    priorityToken,
    balances: supportedTokenBalances,
    isLoading: isLoadingBalances,
    refetch: fetchBalances,
  } = useCardTokenBalances(true);
  const { location: geolocation } = useUserLocation(true);

  const selectedTokenKey = useMemo(() => {
    if (!priorityToken) {
      return null;
    }

    return mapTokenBalanceToTokenKey(priorityToken, theme.colors);
  }, [priorityToken, theme]);

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  if (isLoadingBalances) {
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
          <View style={styles.balanceTextContainer}>
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              variant={TextVariant.HeadingLG}
            >
              {priorityToken
                ? `${priorityToken.balance} ${priorityToken.symbol}`
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
          {geolocation && (
            <View>
              <Icon
                name={IconName.Location}
                size={IconSize.Md}
                color={theme.colors.text.muted}
                style={styles.privacyIcon}
              />
              <Text
                variant={TextVariant.BodySM}
                style={styles.privacyIcon}
                testID="card-view-geolocation"
              >
                {geolocation}
              </Text>
            </View>
          )}
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
                showRemoveMenu={() => {
                  Logger.log('Remove menu pressed');
                }}
                setShowScamWarningModal={() => {
                  Logger.log('Remove menu pressed');
                }}
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
        tokenBalances={supportedTokenBalances || []}
        refreshing={isLoadingBalances}
        onRefresh={fetchBalances}
      />
      <ScreenshotDeterrent
        hasNavigation={hasNavigation}
        enabled
        isSRP={false}
      />
    </View>
  );
};

export default CardHome;

CardHome.navigationOptions = ({
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
