import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  HeaderStandard,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useNotificationPreferences } from '../../NotificationPreferences/hooks';
import { areTradingSignalsChannelsEnabled } from '../../NotificationPreferences/hooks/tradingSignalsChannels';
import TradingSignalsSetupContent from './TradingSignalsSetupContent';
import { TradingSignalsSetupBottomSheetSelectorsIDs } from './TradingSignalsSetupBottomSheet.testIds';

/**
 * Action deferred until the sheet closes with a trading-signal channel enabled.
 * Passed as a navigation param by the caller (e.g. a follow/mute action).
 */
export interface TradingSignalsSetupParams {
  onSetupComplete?: () => void;
}

export const createTradingSignalsSetupNavigationDetails =
  createNavigationDetails<TradingSignalsSetupParams>(
    Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
  );

const TradingSignalsSetupBottomSheet = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { onSetupComplete } = useParams<TradingSignalsSetupParams>();

  const { preferences } = useNotificationPreferences();
  // Read the freshest preferences at close time; the user may have just toggled
  // a channel while the sheet was open. A ref avoids the BottomSheet capturing
  // a stale `onClose` closure.
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const handleClose = useCallback(() => {
    if (areTradingSignalsChannelsEnabled(preferencesRef.current)) {
      onSetupComplete?.();
    }
  }, [onSetupComplete]);

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      goBack={navigation.goBack}
      onClose={handleClose}
      testID={TradingSignalsSetupBottomSheetSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('app_settings.notifications_title')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{
          testID: TradingSignalsSetupBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />

      <TradingSignalsSetupContent />

      <View style={tw.style('h-4')} />
    </BottomSheet>
  );
};

export default TradingSignalsSetupBottomSheet;
