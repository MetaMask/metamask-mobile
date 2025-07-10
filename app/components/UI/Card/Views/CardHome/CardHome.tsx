import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, TouchableOpacity, View } from 'react-native';

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
import Loader from '../../../../../component-library/components-temp/Loader';
import { ScreenshotDeterrent } from '../../../../UI/ScreenshotDeterrent';
import CardImage from '../../assets/card.svg';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AssetListBottomSheet from '../../components/AssetListBottomSheet/AssetListBottomSheet';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { useGetAllowances } from '../../hooks/useGetAllowances';
import { strings } from '../../../../../../locales/i18n';
import useAssetBalance from '../../hooks/useAssetBalance';
import useNavigateToCardPage from '../../hooks/useNavigateToCardPage';
import useNavigateToAddFunds from '../../hooks/useNavigateToAddFunds';
import { CardTokenAllowance } from '../../types';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';

interface ICardHomeProps {
  navigation: NavigationProp<ParamListBase>;
}

/**
 * CardHome Component
 *
 * Main view for the MetaMask Card feature that displays:
 * - User's card balance with privacy controls
 * - Priority token information for spending
 * - Card management options (change asset, spending limits, advanced management)
 * - Asset selection bottom sheet
 *
 * @param props - Component props
 * @returns JSX element representing the card home screen
 */
const CardHome = ({ navigation }: ICardHomeProps) => {
  const [priorityToken, setPriorityToken] = useState<CardTokenAllowance | null>(
    null,
  );
  const [openAssetListBottomSheet, setOpenAssetListBottomSheet] =
    useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);
  const theme = useTheme();

  const hasNavigation = Boolean(navigation);
  const itemHeight = 130;
  const { width: deviceWidth } = Dimensions.get('window');
  const styles = createStyles(theme, itemHeight, deviceWidth);

  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { navigateToAddFunds, isSwapEnabled } = useNavigateToAddFunds(
    navigation,
    priorityToken?.address || '',
  );

  const currentAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const { PreferencesController } = Engine.context;

  const { allowances, isLoading: isLoadingAllowances } = useGetAllowances(
    currentAddress,
    true,
  );
  const { fetchPriorityToken, isLoading: isLoadingPriorityToken } =
    useGetPriorityCardToken(currentAddress);

  const { mainBalance, secondaryBalance } = useAssetBalance(priorityToken);

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const renderAssetListBottomSheet = useCallback(
    () => (
      <AssetListBottomSheet
        sheetRef={sheetRef}
        balances={allowances || []}
        privacyMode={privacyMode}
        setOpenAssetListBottomSheet={setOpenAssetListBottomSheet}
      />
    ),
    [sheetRef, setOpenAssetListBottomSheet, privacyMode, allowances],
  );

  useEffect(() => {
    const getPriorityToken = async () => {
      if (currentAddress && allowances) {
        const token = await fetchPriorityToken(allowances);

        if (token) {
          setPriorityToken(token);
        }
      }
    };

    if (!priorityToken) {
      getPriorityToken();
    }
  }, [allowances, currentAddress, fetchPriorityToken, priorityToken]);

  if (isLoadingAllowances || isLoadingPriorityToken) {
    return (
      <View style={styles.wrapper}>
        <Loader />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
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
                disabled
              />
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_home.add_funds')}
                size={ButtonSize.Sm}
                onPress={navigateToAddFunds}
                disabled={!isSwapEnabled}
                width={ButtonWidthTypes.Full}
              />
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
        title={strings('card.card_home.manage_card_options.change_asset')}
        description={priorityToken?.symbol}
        onPress={() => {
          setOpenAssetListBottomSheet(true);
        }}
      />
      <ManageCardListItem
        title={strings(
          'card.card_home.manage_card_options.manage_spending_limit',
        )}
        description={strings(
          'card.card_home.manage_card_options.manage_spending_limit_description',
        )}
      />
      <ManageCardListItem
        title={strings(
          'card.card_home.manage_card_options.advanced_card_management',
        )}
        description={strings(
          'card.card_home.manage_card_options.advanced_card_management_description',
        )}
        rightIcon={IconName.Export}
        onPress={navigateToCardPage}
      />

      {openAssetListBottomSheet && renderAssetListBottomSheet()}

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
