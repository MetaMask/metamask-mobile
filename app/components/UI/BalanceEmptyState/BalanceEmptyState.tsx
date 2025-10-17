import React from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
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
import ButtonHero from '../../../component-library/components-temp/Buttons/ButtonHero';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';
import { selectChainId } from '../../../selectors/networkController';
import { trace, TraceName } from '../../../util/trace';
import { createDepositNavigationDetails } from '../Ramp/Deposit/routes/utils';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';
import bankTransferImage from '../../../images/bank-transfer.png';

/**
 * BalanceEmptyState smart component displays an empty state for wallet balance
 * with an illustration, title, subtitle, and action button that navigates to deposit flow.
 */
const BalanceEmptyState: React.FC<BalanceEmptyStateProps> = ({
  testID = 'balance-empty-state',
  ...props
}) => {
  const tw = useTailwind();
  const chainId = useSelector(selectChainId);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleAction = () => {
    navigation.navigate(...createDepositNavigationDetails());

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
      ).build(),
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Add funds',
          location: 'BalanceEmptyState',
          chain_id_destination: getDecimalChainId(chainId),
          ramp_type: 'DEPOSIT',
        })
        .build(),
    );

    trace({
      name: TraceName.LoadDepositExperience,
    });
  };

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
      twClassName={`rounded-2xl ${props.twClassName}`}
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
      <ButtonHero
        onPress={handleAction}
        isFullWidth
        testID={`${testID}-action-button`}
      >
        {strings('wallet.add_funds')}
      </ButtonHero>
    </Box>
  );
};

export default BalanceEmptyState;
