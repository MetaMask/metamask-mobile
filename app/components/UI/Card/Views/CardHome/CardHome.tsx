import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import createStyles, { headerStyle } from './styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Loader from '../../../../../component-library/components-temp/Loader';
import { ScreenshotDeterrent } from '../../../../UI/ScreenshotDeterrent';
import CardImage from '../../assets/card.svg';
import ManageCardListItem from '../../components/ManageCardListItem/ManageCardListItem';
import { selectChainId } from '../../../../../selectors/networkController';
import { isSwapsAllowed } from '../../../Swaps/utils';
import AppConstants from '../../../../../core/AppConstants';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AssetListBottomSheet from '../../components/AssetListBottomSheet/AssetListBottomSheet';
import CardAssetItem from '../../components/CardAssetItem/CardAssetItem';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { useGetAllowances } from '../../hooks/useGetAllowances';
import { mapCardTokenToAssetKey } from '../../utils';
import { AllowanceState, CardToken } from '../../types';
import { FlashListAssetKey } from '../../../Tokens/TokenList';
import Logger from '../../../../../util/Logger';
import { Hex } from 'viem';
import { hexToDecimal } from '../../../../../util/conversions';
import { useGetSupportedTokens } from '../../hooks/useGetSupportedAssets';
import { strings } from '../../../../../../locales/i18n';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { BrowserTab } from '../../../Tokens/types';
import { isCardUrl } from '../../../../../util/url';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

interface ICardHomeProps {
  navigation?: NavigationProp<ParamListBase>;
}

const CardHome = ({ navigation }: ICardHomeProps) => {
  const hasNavigation = Boolean(navigation);
  const currentAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { PreferencesController, TokenBalancesController } = Engine.context;
  const privacyMode = useSelector(selectPrivacyMode);
  const theme = useTheme();
  const itemHeight = 130;
  const { width: deviceWidth } = Dimensions.get('window');
  const styles = createStyles(theme, itemHeight, deviceWidth);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const { allowances, isLoading: isLoadingAllowances } = useGetAllowances(
    currentAddress,
    true,
  );
  const { fetchPriorityToken, isLoading: isLoadingPriorityToken } =
    useGetPriorityCardToken(currentAddress);
  const [priorityToken, setPriorityToken] = useState<
    | (CardToken &
        FlashListAssetKey & {
          tag?: AllowanceState;
        })
    | null
  >(null);
  const { supportedTokens } = useGetSupportedTokens();
  const chainId = useSelector(selectChainId);
  const sheetRef = useRef<BottomSheetRef>(null);
  const [openAssetListBottomSheet, setOpenAssetListBottomSheet] =
    useState(false);
  const [balance, setBalance] = useState<string>();
  const { trackEvent, createEventBuilder } = useMetrics();

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isSwapEnabled = useMemo(
    () => AppConstants.SWAPS.ACTIVE && isSwapsAllowed(chainId),
    [chainId],
  );

  const goToAddFunds = useCallback(() => {
    if (isSwapEnabled && priorityToken) {
      navigation?.navigate(Routes.SWAPS, {
        screen: Routes.SWAPS_AMOUNT_VIEW,
        params: {
          chainId,
          destinationToken: priorityToken?.address,
          sourcePage: 'CardHome',
        },
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
      );
    }
  }, [
    isSwapEnabled,
    priorityToken,
    trackEvent,
    createEventBuilder,
    navigation,
    chainId,
  ]);

  const mappedSupportedTokens = useMemo(
    () =>
      supportedTokens.map((token) => {
        const allowance = allowances?.find(
          (item) => item.address.toLowerCase() === token.address?.toLowerCase(),
        );
        return {
          ...token,
          ...mapCardTokenToAssetKey(
            {
              address: token.address as `0x${string}`,
              symbol: token.symbol as string,
              decimals: token.decimals as number,
              name: token.name as string,
            },
            chainId,
            allowance?.allowance,
          ),
        };
      }),
    [supportedTokens, allowances, chainId],
  );

  const renderAssetListBottomSheet = useCallback(
    () => (
      <AssetListBottomSheet
        sheetRef={sheetRef}
        balances={mappedSupportedTokens}
        privacyMode={privacyMode}
        setOpenAssetListBottomSheet={setOpenAssetListBottomSheet}
      />
    ),
    [sheetRef, setOpenAssetListBottomSheet, privacyMode, mappedSupportedTokens],
  );

  useEffect(() => {
    const getPriorityToken = async () => {
      if (currentAddress && allowances) {
        Logger.log(
          'Fetching priority token for current address:',
          currentAddress,
        );
        // Fetch the priority token when allowances are available
        const nonZeroAllowanceTokens = allowances
          .filter((item) => item.amount.gt(0))
          .map((item) => item.address);
        Logger.log(
          'Non-zero allowance tokens for priority token fetch:',
          nonZeroAllowanceTokens,
        );
        const token = await fetchPriorityToken(nonZeroAllowanceTokens);

        if (token) {
          const allowance = allowances.find(
            (item) =>
              item.address.toLowerCase() === token.address.toLowerCase(),
          );

          if (allowance) {
            setPriorityToken({
              ...token,
              ...mapCardTokenToAssetKey(token, chainId, allowance.allowance),
            });
          }
        }
      }
    };

    if (!priorityToken) {
      Logger.log(
        'Priority token not set, fetching priority token for current address:',
        currentAddress,
      );
      // Fetch the priority token if it is not already set
      getPriorityToken();
    }
  }, [allowances, chainId, currentAddress, fetchPriorityToken, priorityToken]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (priorityToken && currentAddress) {
        try {
          const priorityTokenBalance =
            await TokenBalancesController.getErc20Balances({
              chainId: chainId as Hex,
              accountAddress: currentAddress as Hex,
              tokenAddresses: [priorityToken.address as Hex],
            });
          const tokenBalance =
            priorityTokenBalance[priorityToken.address as Hex];
          const formattedTokenBalance = renderFromTokenMinimalUnit(
            hexToDecimal(tokenBalance).toString(),
            priorityToken.decimals,
          );

          setBalance(formattedTokenBalance ?? '0');
        } catch (error) {
          Logger.error(error as Error, 'Error fetching balance');
        }
      }
    };

    fetchBalance();
  }, [priorityToken, currentAddress, TokenBalancesController, chainId]);

  const isLoading = useMemo(
    () => isLoadingAllowances || isLoadingPriorityToken || !priorityToken,
    [isLoadingAllowances, isLoadingPriorityToken, priorityToken],
  );

  const handleAdvancedCardManagementPress = useCallback(() => {
    const existingCardTab = browserTabs.find(({ url }: BrowserTab) =>
      isCardUrl(url),
    );

    let existingTabId;
    let newTabUrl;

    if (existingCardTab) {
      existingTabId = existingCardTab.id;
    } else {
      const cardUrl = new URL(AppConstants.CARD.URL);

      newTabUrl = cardUrl.href;
    }
    const params = {
      ...(newTabUrl && { newTabUrl }),
      ...(existingTabId && { existingTabId, newTabUrl: undefined }),
      timestamp: Date.now(),
    };
    navigation?.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_ADVANCED_CARD_MANAGEMENT_CLICKED,
      )
        .addProperties({
          portfolioUrl: AppConstants.CARD.URL,
        })
        .build(),
    );
  }, [browserTabs, createEventBuilder, navigation, trackEvent]);

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <Loader />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrapper}>
      <View style={styles.defaultPadding}>
        <View style={styles.balanceContainer}>
          <View style={styles.balanceTextContainer}>
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              variant={TextVariant.HeadingLG}
            >
              {priorityToken ? `${balance} ${priorityToken.symbol}` : '0'}
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
                onPress={goToAddFunds}
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
        onPress={handleAdvancedCardManagementPress}
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
