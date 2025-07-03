import React, { useCallback, useMemo } from 'react';
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
import Logger from '../../../../../util/Logger';
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
import { TokenListItem } from '../../../Tokens/TokenList/TokenListItem';
import { mapTokenBalanceToTokenKey } from '../../sdk';
import { useCardTokenBalances } from '../../hooks';
import CardImage from '../../assets/card.svg';
import ManageCardListItem from '../../components/ManageCardListItem/ManageCardListItem';
import { selectChainId } from '../../../../../selectors/networkController';
import { isSwapsAllowed } from '../../../Swaps/utils';
import AppConstants from '../../../../../core/AppConstants';

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
  const { priorityToken, isLoading: isLoadingBalances } =
    useCardTokenBalances(true);
  const chainId = useSelector(selectChainId);

  const selectedTokenKey = useMemo(() => {
    if (!priorityToken) {
      return null;
    }

    return mapTokenBalanceToTokenKey(priorityToken);
  }, [priorityToken]);

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
    }
  }, [navigation, chainId, priorityToken, isSwapEnabled]);

  if (isLoadingBalances) {
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
          <CardImage name="CardImage" />
        </View>
        <View style={styles.spendingWithContainer}>
          <Text
            variant={TextVariant.HeadingSM}
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
                variant={ButtonVariants.Primary}
                label="Add funds"
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
          Manage card
        </Text>
      </View>
      <ManageCardListItem
        title="Change asset"
        description={priorityToken?.symbol}
      />
      <ManageCardListItem
        title="Manage spending limit"
        description="Currently on Approve card spending"
      />
      <ManageCardListItem
        title="Advanced Card Management"
        description="See detailed transactions, freeze your card, etc."
        rightIcon={IconName.Export}
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
      style={headerStyle.invisibleIcon}
    />
  ),
});
