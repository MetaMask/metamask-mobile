import React from 'react';
import createStyles from '../../styles';
import { useTheme } from '../../../../../util/theme';
import { View } from 'react-native';
import TextComponent, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectChainId } from '../../../../../selectors/networkController';
import { trace, TraceName } from '../../../../../util/trace';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';
import { createDepositNavigationDetails } from '../../../Ramp/Deposit/routes/utils';

export const TokenListFooter = () => {
  const chainId = useSelector(selectChainId);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();

  const shouldShowFooter =
    selectedAccountMultichainBalance?.totalFiatBalance === 0;

  const goToDeposit = () => {
    navigation.navigate(...createDepositNavigationDetails());

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
      ).build(),
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Deposit',
          location: 'TokenListFooter',
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
    <>
      {/* render buy button */}
      {shouldShowFooter && (
        <View style={styles.buy}>
          <TextComponent
            variant={TextVariant.HeadingSM}
            style={styles.buyTitle}
          >
            {strings('wallet.fund_your_wallet_to_get_started')}
          </TextComponent>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={styles.buyButton}
            onPress={goToDeposit}
            label={strings('wallet.add_funds')}
          />
        </View>
      )}
    </>
  );
};
