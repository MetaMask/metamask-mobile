import React, { useCallback } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { getDecimalChainId } from '../../../util/networks';
import { selectChainId } from '../../../selectors/networkController';
import Routes from '../../../constants/navigation/Routes';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';
import bankTransferImage from '../../../images/bank-transfer.png';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';

/**
 * BalanceEmptyState smart component displays an empty state for wallet balance
 * with an illustration, title, subtitle, and action button that opens the fund menu.
 */
const BalanceEmptyState: React.FC<BalanceEmptyStateProps> = ({
  testID = 'balance-empty-state',
  ...props
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = useSelector(selectChainId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  const buttonClickData = useRampsButtonClickData();

  const handleAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          button_text: 'Add funds',
          location: 'BalanceEmptyState',
          chain_id_destination: getDecimalChainId(chainId),
          ramp_type: 'FUND_MENU',
          region: rampGeodetectedRegion,
          is_authenticated: buttonClickData.is_authenticated,
          preferred_provider: buttonClickData.preferred_provider,
          order_count: buttonClickData.order_count,
        })
        .build(),
    );

    // Open FundActionMenu so gated options (e.g. Memecoins) can appear alongside Buy/Sell.
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
    });
  }, [
    buttonClickData.is_authenticated,
    buttonClickData.order_count,
    buttonClickData.preferred_provider,
    chainId,
    createEventBuilder,
    navigation,
    rampGeodetectedRegion,
    trackEvent,
  ]);

  return (
    <Box
      paddingLeft={4}
      paddingRight={4}
      paddingTop={3}
      paddingBottom={4}
      justifyContent={BoxJustifyContent.Center}
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      gap={5}
      testID={testID}
      {...props}
      twClassName={`rounded-2xl ${props?.twClassName ?? ''}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        gap={1}
        alignItems={BoxAlignItems.Center}
      >
        <Image
          source={bankTransferImage}
          style={tw.style('w-[100px] h-[100px]')}
          resizeMode="cover"
          testID={`${testID}-image`}
        />
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          twClassName="text-center"
          testID={`${testID}-title`}
        >
          {strings('wallet.fund_your_wallet')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          twClassName="text-center"
          testID={`${testID}-subtitle`}
        >
          {strings('wallet.get_ready_for_web3')}
        </Text>
      </Box>
      <Button
        size={ButtonSize.Lg}
        onPress={handleAction}
        isFullWidth
        testID={`${testID}-action-button`}
      >
        {strings('wallet.add_funds')}
      </Button>
    </Box>
  );
};

export default BalanceEmptyState;
