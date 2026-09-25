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
import { formatCurrency } from '../../Bridge/utils/currencyUtils';
import { TouchableOpacity } from 'react-native';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import { useQuickBuyContext } from '../useQuickBuyContext';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

const QuickBuyToolbar: React.FC = () => {
  const {
    features,
    hasSellableBalance,
    isQuickAmountPreferencesLoaded,
    currentCurrency,
    sourceToken,
    destToken,
    tokenPrice,
    target,
    tradeMode,
    setTradeMode,
    setActiveScreen,
  } = useQuickBuyContext();

  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;
  const showSettings = features.quickAmountPills;
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
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
              {tradeMode === 'sell' ? 'Sell' : 'Buy'}{' '}
              {headerToken?.symbol ?? target?.tokenSymbol ?? ''}
            </Text>
            {showFullToggle ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Change trade mode"
                onPress={() =>
                  setTradeMode(tradeMode === 'buy' ? 'sell' : 'buy')
                }
                testID="quick-buy-trade-mode-toggle"
              >
                <Icon
                  name={DsIconName.SwapHorizontal}
                  size={IconSize.Sm}
                  color={IconColor.PrimaryDefault}
                />
              </TouchableOpacity>
            ) : null}
          </Box>
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
        {showSettings ? (
          <ButtonIcon
            iconName={DsIconName.Setting}
            size={ButtonIconSize.Md}
            isDisabled={!isQuickAmountPreferencesLoaded}
            onPress={() => setActiveScreen('editQuickAmounts')}
            testID={QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_BUTTON}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export default QuickBuyToolbar;
