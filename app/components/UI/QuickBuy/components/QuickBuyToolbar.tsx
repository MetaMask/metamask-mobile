import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName as DsIconName,
  Icon,
  IconColor,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { formatCurrency } from '../../Bridge/utils/currencyUtils';
import { TouchableOpacity } from 'react-native';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { strings } from '../../../../../locales/i18n';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

const QuickBuyToolbar: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    features,
    hasSellableBalance,
    currentCurrency,
    sourceToken,
    destToken,
    tokenPrice,
    target,
    tradeMode,
    setTradeMode,
  } = useQuickBuyContext();

  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;
  const handleOpenSlippage = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  };
  const headerToken = tradeMode === 'sell' ? sourceToken : destToken;
  const tokenPriceLabel =
    tokenPrice !== undefined
      ? formatCurrency(tokenPrice, currentCurrency)
      : undefined;

  return (
    <Box
      twClassName="px-4 pt-4 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
      >
        {headerToken ? (
          <QuickBuyTokenIcon token={headerToken} />
        ) : (
          <Box twClassName="h-10 w-10" />
        )}
        <Box>
          <TouchableOpacity
            disabled={!showFullToggle}
            accessibilityRole={showFullToggle ? 'button' : undefined}
            accessibilityLabel={
              showFullToggle
                ? strings('social_leaderboard.quick_buy.change_trade_mode')
                : undefined
            }
            onPress={() => setTradeMode(tradeMode === 'buy' ? 'sell' : 'buy')}
            testID={showFullToggle ? 'quick-buy-trade-mode-toggle' : undefined}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.HeadingSm}
                color={TextColor.TextDefault}
              >
                {strings(
                  tradeMode === 'sell'
                    ? 'social_leaderboard.quick_buy.sell_title'
                    : 'social_leaderboard.quick_buy.title',
                  { symbol: headerToken?.symbol ?? target?.tokenSymbol ?? '' },
                )}
              </Text>
              {showFullToggle ? (
                <Icon
                  name={DsIconName.SwapHorizontal}
                  size={IconSize.Sm}
                  color={IconColor.PrimaryDefault}
                />
              ) : null}
            </Box>
          </TouchableOpacity>
          {tokenPriceLabel ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {tokenPriceLabel}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <ButtonIcon
          iconName={DsIconName.Setting}
          size={ButtonIconSize.Md}
          onPress={handleOpenSlippage}
          testID={QuickBuySheetSelectorsIDs.SETTINGS_BUTTON}
        />
      </Box>
    </Box>
  );
};

export default QuickBuyToolbar;
