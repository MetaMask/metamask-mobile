import { useNavigation } from '@react-navigation/native';
import _ from 'lodash';
import React from 'react';
import { View } from 'react-native-animatable';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import { capitalize } from '../../../../../util/general';
import { getDecimalChainId } from '../../../../../util/networks';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { parseFloatSafe } from '../../utils/number';
import styleSheet from './EmptyStateCta.styles';

interface EarnEmptyStateCta {
  token: TokenI;
}

export const EARN_EMPTY_STATE_CTA_TEST_ID = 'earn-empty-state-cta-test-id';

const EarnEmptyStateCta = ({ token }: EarnEmptyStateCta) => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const { createEventBuilder, trackEvent } = useMetrics();

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const earnToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnToken(state, token),
  );

  const estimatedAnnualRewardsFormatted = parseFloatSafe(
    earnToken?.experience?.estimatedAnnualRewardsFormatted ?? '0',
  ).toFixed(0);
  const apr = earnToken?.experience?.apr;
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
      params: { token },
    });
  };

  const navigateToLendingHistoricApyChart = () => {
    navigate(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.LENDING_LEARN_MORE,
      params: { asset: earnToken },
    });
  };

  if (!token || _.isEmpty(token) || !isStablecoinLendingEnabled) return <></>;

  return (
    <View style={styles.container} testID={EARN_EMPTY_STATE_CTA_TEST_ID}>
      <Text variant={TextVariant.HeadingMD} style={styles.heading}>
        {strings('earn.empty_state_cta.heading', { tokenSymbol: token.symbol })}
      </Text>
      <Text style={styles.body}>
        {strings('earn.empty_state_cta.body', {
          tokenSymbol: token.symbol,
          protocol: capitalize(earnToken?.experience.market?.protocol),
        })}{' '}
        <Text variant={TextVariant.BodyMDBold} color={TextColor.Success}>
          {apr}%
        </Text>{' '}
        {strings('earn.empty_state_cta.annually')}{' '}
        <Button
          label={strings('earn.empty_state_cta.learn_more')}
          variant={ButtonVariants.Link}
          onPress={navigateToLendingHistoricApyChart}
        />
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Md}
        width={ButtonWidthTypes.Full}
        label={strings('earn.empty_state_cta.earn')}
        onPress={navigateToLendInputScreen}
      />
    </View>
  );
};

export default EarnEmptyStateCta;
