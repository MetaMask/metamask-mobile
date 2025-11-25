import React, { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { FlatList } from 'react-native-gesture-handler';
import ListItemColumn from '../../../../../component-library/components/List/ListItemColumn';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { createStyles } from './AddFundsBottomSheet.styles';
import Label from '../../../../../component-library/components/Form/Label';
import { useTheme } from '../../../../../util/theme';
import { View } from 'react-native';
import { CardTokenAllowance } from '../../types';
import AppConstants from '../../../../../core/AppConstants';
import { isSwapsAllowed } from '../../../Swaps/utils';
import useDepositEnabled from '../../../Ramp/Deposit/hooks/useDepositEnabled';
import { getDecimalChainId } from '../../../../../util/networks';
import { trace, TraceName } from '../../../../../util/trace';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { strings } from '../../../../../../locales/i18n';
import { CardHomeSelectors } from '../../../../../../e2e/selectors/Card/CardHome.selectors';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import { getDetectedGeolocation } from '../../../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../../../Ramp/hooks/useRampsButtonClickData';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';

interface AddFundsModalNavigationDetails {
  priorityToken?: CardTokenAllowance;
}

export const createAddFundsModalNavigationDetails =
  createNavigationDetails<AddFundsModalNavigationDetails>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.ADD_FUNDS,
  );

const AddFundsBottomSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { priorityToken } = useParams<AddFundsModalNavigationDetails>();

  const { isDepositEnabled } = useDepositEnabled();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { openSwaps } = useOpenSwaps({
    priorityToken,
  });
  const { trackEvent, createEventBuilder } = useMetrics();
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  const { goToDeposit } = useRampNavigation();
  const buttonClickData = useRampsButtonClickData();

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const handleOpenSwaps = useCallback(() => {
    if (!priorityToken) return;
    openSwaps({
      beforeNavigate: (nav) => closeBottomSheetAndNavigate(nav),
    });
  }, [priorityToken, openSwaps, closeBottomSheetAndNavigate]);

  const openDeposit = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      goToDeposit();
    });
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
      ).build(),
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Deposit',
          location: 'CardHome',
          chain_id_destination: getDecimalChainId(priorityToken?.caipChainId),
          ramp_type: 'DEPOSIT',
          region: rampGeodetectedRegion,
          ramp_routing: buttonClickData.ramp_routing,
          is_authenticated: buttonClickData.is_authenticated,
          preferred_provider: buttonClickData.preferred_provider,
          order_count: buttonClickData.order_count,
        })
        .build(),
    );

    trace({
      name: TraceName.LoadDepositExperience,
    });
  }, [
    rampGeodetectedRegion,
    closeBottomSheetAndNavigate,
    goToDeposit,
    trackEvent,
    createEventBuilder,
    priorityToken,
    buttonClickData,
  ]);

  const options = [
    {
      label: strings('card.add_funds_bottomsheet.deposit'),
      description: strings('card.add_funds_bottomsheet.deposit_description'),
      icon: IconName.Bank,
      onPress: openDeposit,
      testID: CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_DEPOSIT_OPTION,
      enabled: isDepositEnabled,
    },
    {
      label: strings('card.add_funds_bottomsheet.swap'),
      description: strings('card.add_funds_bottomsheet.swap_description', {
        symbol: priorityToken?.symbol,
      }),
      icon: IconName.SwapHorizontal,
      onPress: handleOpenSwaps,
      testID: CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_SWAP_OPTION,
      enabled:
        AppConstants.SWAPS.ACTIVE &&
        isSwapsAllowed(
          safeFormatChainIdToHex(priorityToken?.caipChainId ?? ''),
        ),
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      testID={CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('card.add_funds_bottomsheet.select_method')}
        </Text>
      </BottomSheetHeader>
      <FlatList
        scrollEnabled={false}
        data={options}
        renderItem={({ item }) =>
          item.enabled ? (
            <ListItemSelect
              onPress={() => {
                item.onPress();
              }}
              testID={item.testID}
            >
              <ListItemColumn>
                <View style={styles.iconContainer}>
                  <Icon
                    name={item.icon}
                    size={IconSize.Md}
                    color={IconColor.PrimaryDefault}
                  />
                </View>
              </ListItemColumn>
              <ListItemColumn>
                <Label>{item.label}</Label>
                <Text
                  variant={TextVariant.BodySM}
                  color={theme.colors.text.alternative}
                >
                  {item.description}
                </Text>
              </ListItemColumn>
            </ListItemSelect>
          ) : null
        }
        keyExtractor={(item) => item.label}
      />
    </BottomSheet>
  );
};

export default AddFundsBottomSheet;
