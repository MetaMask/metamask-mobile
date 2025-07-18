import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useSelector } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles, { headerStyle } from './CardHome.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { ScreenshotDeterrent } from '../../../../UI/ScreenshotDeterrent';
import CardImage from '../../assets/card.svg';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { strings } from '../../../../../../locales/i18n';
import { useAssetBalance } from '../../hooks/useAssetBalance';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { AllowanceState, CardTokenAllowance } from '../../types';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../../../Bridge/types';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * CardHome Component
 *
 * Main view for the MetaMask Card feature that displays:
 * - User's card balance with privacy controls
 * - Priority token information for spending
 * - Card management options (advanced management)
 *
 * @param props - Component props
 * @returns JSX element representing the card home screen
 */
const CardHome = () => {
  const navigation = useNavigation();
  const [priorityToken, setPriorityToken] = useState<CardTokenAllowance | null>(
    null,
  );
  const theme = useTheme();

  const hasNavigation = Boolean(navigation);
  const styles = createStyles(theme);

  const currentAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const { PreferencesController } = Engine.context;

  const {
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error: errorPriorityToken,
  } = useGetPriorityCardToken(currentAddress);
  const { mainBalance, secondaryBalance, asset } =
    useAssetBalance(priorityToken);
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { goToBridge } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenDetails,
    sourcePage: Routes.CARD.HOME,
    token: {
      address: priorityToken?.address,
      chainId: priorityToken?.chainId,
      decimals: priorityToken?.decimals,
      symbol: priorityToken?.symbol,
      name: priorityToken?.name,
      image: asset?.image,
    } as BridgeToken,
  });

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  useEffect(() => {
    const getPriorityToken = async () => {
      if (currentAddress) {
        const token = await fetchPriorityToken();

        if (token) {
          setPriorityToken(token);
        }
      }
    };

    if (!priorityToken) {
      getPriorityToken();
    }
  }, [currentAddress, fetchPriorityToken, priorityToken]);

  if (errorPriorityToken) {
    return (
      <View style={styles.loadingContainer}>
        <Text
          variant={TextVariant.BodyLGMedium}
          color={theme.colors.error.default}
        >
          {errorPriorityToken}
        </Text>
      </View>
    );
  }

  if (isLoadingPriorityToken || !priorityToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary.default}
          testID="loader"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
    >
      <View style={styles.defaultPadding}>
        <View style={styles.balanceContainer}>
          <View style={styles.balanceTextContainer}>
            <View style={styles.mainBalanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                variant={TextVariant.HeadingLG}
              >
                {mainBalance ?? 0}
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
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              variant={TextVariant.BodyMD}
              color={theme.colors.text.muted}
            >
              {secondaryBalance ?? 0}
            </SensitiveText>
          </View>
          <CardImage name="CardImage" />
        </View>

        <View style={styles.spendingWithContainer}>
          <Text
            variant={TextVariant.HeadingSM}
            style={styles.spendingWithTitle}
          >
            {strings('card.card_home.spending_with')}
          </Text>
          {priorityToken && (
            <View style={styles.spendingWith}>
              <CardAssetItem
                assetKey={priorityToken}
                privacyMode={privacyMode}
                shouldShowAllowance={false}
                disabled
              />
              {priorityToken.allowanceState === AllowanceState.Limited && (
                <View style={styles.limitedAllowanceWarningContainer}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={theme.colors.text.alternative}
                  >
                    {strings('card.card_home.limited_spending_warning')}
                  </Text>
                </View>
              )}
              <View style={styles.addFundsButtonContainer}>
                <Button
                  variant={ButtonVariants.Primary}
                  label={strings('card.card_home.add_funds')}
                  size={ButtonSize.Sm}
                  onPress={goToBridge}
                  width={ButtonWidthTypes.Full}
                  testID="add-funds-button"
                />
              </View>
            </View>
          )}
        </View>

        <Text
          variant={TextVariant.HeadingSM}
          testID={'card-view-balance-title'}
        >
          {strings('card.card_home.manage_card_options.manage_card')}
        </Text>
      </View>

      <ManageCardListItem
        title={strings(
          'card.card_home.manage_card_options.advanced_card_management',
        )}
        description={strings(
          'card.card_home.manage_card_options.advanced_card_management_description',
        )}
        rightIcon={IconName.Export}
        onPress={navigateToCardPage}
        testID="advanced-card-management-item"
      />

      <ScreenshotDeterrent
        hasNavigation={hasNavigation}
        enabled
        isSRP={false}
      />
    </ScrollView>
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
      iconName={IconName.ArrowLeft}
      onPress={() => navigation.goBack()}
    />
  ),
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingSM}
      style={headerStyle.title}
      testID={'card-view-title'}
    >
      {strings('card.card')}
    </Text>
  ),
  headerRight: () => (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.Setting}
      style={headerStyle.invisibleIcon}
    />
  ),
});
