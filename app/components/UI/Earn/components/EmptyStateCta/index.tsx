import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './EmptyStateCta.styles';
import Avatar, {
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { View } from 'react-native-animatable';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../Earn/Views/EarnInputView/EarnInputView.types';
import { TokenI } from '../../../Tokens/types';
import { useEarnTokenDetails } from '../../../Earn/hooks/useEarnTokenDetails';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { getDecimalChainId } from '../../../../../util/networks';
import { isStablecoinLendingFeatureEnabled } from '../../../Stake/constants';
import _ from 'lodash';

interface EarnEmptyStateCta {
  token: TokenI;
}

const EarnEmptyStateCta = ({ token }: EarnEmptyStateCta) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const { createEventBuilder, trackEvent } = useMetrics();

  const { colors } = theme;

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const { apr, estimatedAnnualRewardsFormatted } =
    getTokenWithBalanceAndApr(token);

  const navigateToLendInputScreen = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_EMPTY_STATE_CTA_CLICKED)
        .addProperties({
          provider: EVENT_PROVIDERS.CONSENSYS,
          location: EVENT_LOCATIONS.TOKEN_DETAILS_SCREEN,
          token_name: token.name,
          token_symbol: token.symbol,
          token_chain_id: getDecimalChainId(token.chainId),
          estimatedAnnualRewards: estimatedAnnualRewardsFormatted,
        })
        .build(),
    );

    navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token, action: EARN_INPUT_VIEW_ACTIONS.LEND },
    });
  };

  if (!token || _.isEmpty(token) || !isStablecoinLendingFeatureEnabled())
    return <></>;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Avatar
          style={styles.icon}
          variant={AvatarVariant.Icon}
          name={IconName.Plant}
          backgroundColor={colors.success.muted}
          iconColor={colors.success.default}
        />
      </View>
      <Text variant={TextVariant.HeadingMD} style={styles.heading}>
        {strings('earn.empty_state_cta.heading', { tokenSymbol: token.symbol })}
      </Text>
      <Text style={styles.body}>
        {strings('earn.empty_state_cta.body_prefix')}{' '}
        <Text variant={TextVariant.BodyMDBold} color={TextColor.Success}>
          {estimatedAnnualRewardsFormatted} ({apr}% {strings('stake.apr')})
        </Text>{' '}
        {strings('earn.empty_state_cta.body_suffix', {
          tokenSymbol: token.symbol,
        })}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        label={strings('earn.empty_state_cta.start_earning')}
        onPress={navigateToLendInputScreen}
      />
    </View>
  );
};

export default EarnEmptyStateCta;
