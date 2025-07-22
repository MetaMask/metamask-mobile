import React, { useCallback } from 'react';
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
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { strings } from '../../../../../../locales/i18n';
import { useAssetBalance } from '../../hooks/useAssetBalance';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { AllowanceState } from '../../types';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../../../Bridge/types';
import Routes from '../../../../../constants/navigation/Routes';
import CardImage from '../../components/CardImage';

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
  const [retries, setRetries] = React.useState(0);

  const navigation = useNavigation();
  const theme = useTheme();

  const styles = createStyles(theme);

  const currentAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const { PreferencesController } = Engine.context;

  const {
    priorityToken,
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error: errorPriorityToken,
  } = useGetPriorityCardToken(currentAddress);
  const { balanceFiat, asset } = useAssetBalance(priorityToken);
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { goToBridge } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenDetails,
    sourcePage: Routes.CARD.HOME,
    token: {
      ...priorityToken,
      image: asset?.image,
    } as BridgeToken,
  });

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isAllowanceLimited =
    priorityToken?.allowanceState === AllowanceState.Limited;

  if (errorPriorityToken) {
    return (
      <View style={styles.errorContainer}>
        <Icon
          name={IconName.Forest}
          size={IconSize.Xl}
          color={theme.colors.icon.default}
        />
        <Text
          variant={TextVariant.HeadingSM}
          color={theme.colors.text.alternative}
        >
          {strings('card.card_home.error_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={theme.colors.text.alternative}
          style={styles.errorDescription}
        >
          {strings('card.card_home.error_description')}
        </Text>
        {retries < 3 && (
          <View style={styles.tryAgainButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                setRetries((prevState) => prevState + 1);
                fetchPriorityToken();
              }}
              testID="try-again-button"
            />
          </View>
        )}
      </View>
    );
  }

  if (isLoadingPriorityToken) {
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
      {priorityToken && (
        <View style={styles.cardBalanceContainer}>
          <View
            style={[
              styles.balanceTextContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              variant={TextVariant.HeadingLG}
            >
              {balanceFiat ?? 0}
            </SensitiveText>
            <TouchableOpacity
              onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
              testID="privacy-toggle-button"
            >
              <Icon
                name={privacyMode ? IconName.EyeSlash : IconName.Eye}
                size={IconSize.Md}
                color={theme.colors.icon.alternative}
              />
            </TouchableOpacity>
          </View>
          <View
            style={[styles.cardImageContainer, styles.defaultHorizontalPadding]}
          >
            <CardImage />
          </View>
          <View
            style={[
              styles.cardAssetItemContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <CardAssetItem
              assetKey={priorityToken}
              privacyMode={privacyMode}
              shouldShowAllowance={false}
              disabled
            />
          </View>
          {isAllowanceLimited && (
            <>
              <View style={styles.divider} />
              <View
                style={[
                  styles.limitedAllowanceWarningContainer,
                  styles.defaultHorizontalPadding,
                ]}
              >
                <Text>
                  <Text
                    variant={TextVariant.BodySM}
                    color={theme.colors.text.alternative}
                  >
                    {strings('card.card_home.limited_spending_warning')}
                  </Text>{' '}
                  <Text
                    variant={TextVariant.BodySM}
                    color={theme.colors.text.alternative}
                    style={styles.limitedAllowanceManageCardText}
                  >
                    {strings('card.card_home.manage_card_options.manage_card')}
                    {'.'}
                  </Text>
                </Text>
              </View>
            </>
          )}
          <View
            style={[
              styles.addFundsButtonContainer,
              styles.defaultHorizontalPadding,
              isAllowanceLimited && styles.defaultMarginTop,
            ]}
          >
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

      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.manage_card')}
        description={strings(
          'card.card_home.manage_card_options.advanced_card_management_description',
        )}
        rightIcon={IconName.Export}
        onPress={navigateToCardPage}
        testID="advanced-card-management-item"
      />
    </ScrollView>
  );
};

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

export default CardHome;
