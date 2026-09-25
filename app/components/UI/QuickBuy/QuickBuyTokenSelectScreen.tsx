import React, { useCallback } from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import {
  BottomSheetHeader,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { TokenSelectorType, type BridgeToken } from '../Bridge/types';
import { BridgeTokenSelectorContent } from '../Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Token picker for the active trade mode, rendered with the Bridge asset
 * picker. Buy picks the "Pay with" token from held assets only; Sell picks the
 * "Receive" token from any asset. Both exclude the position token.
 */
const QuickBuyTokenSelectScreen: React.FC = () => {
  const {
    tradeMode,
    positionTokenFromSetup,
    selectedSourceToken,
    handleSelectSourceToken,
    selectedReceiveToken,
    handleSelectReceiveToken,
    setActiveScreen,
  } = useQuickBuyContext();
  const isSell = tradeMode === 'sell';

  const handleBack = useCallback(
    () => setActiveScreen('amount'),
    [setActiveScreen],
  );

  const handleSelect = useCallback(
    (token: BridgeToken) => {
      if (isSell) {
        handleSelectReceiveToken(token);
      } else {
        handleSelectSourceToken(token);
      }
      setActiveScreen('amount');
    },
    [
      isSell,
      handleSelectReceiveToken,
      handleSelectSourceToken,
      setActiveScreen,
    ],
  );

  return (
    <>
      <BottomSheetHeader
        onBack={handleBack}
        backButtonProps={{ testID: QuickBuySheetSelectorsIDs.PAY_WITH_BACK }}
        testID={QuickBuySheetSelectorsIDs.PAY_WITH_HEADER}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings(
            isSell
              ? 'social_leaderboard.quick_buy.receive'
              : 'social_leaderboard.quick_buy.pay_with',
          )}
        </Text>
      </BottomSheetHeader>
      <BridgeTokenSelectorContent
        type={isSell ? TokenSelectorType.Dest : TokenSelectorType.Source}
        selectedToken={isSell ? selectedReceiveToken : selectedSourceToken}
        onTokenPress={handleSelect}
        balanceOnly={!isSell}
        excludeToken={positionTokenFromSetup}
        onOpenNetworkList={() => setActiveScreen('selectNetwork')}
        hostManagesNetworkFilter
        renderScrollComponent={GestureHandlerScrollView}
      />
    </>
  );
};

export default QuickBuyTokenSelectScreen;
