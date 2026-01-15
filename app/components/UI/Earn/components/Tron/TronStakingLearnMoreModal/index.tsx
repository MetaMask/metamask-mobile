import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { endTrace, trace, TraceName } from '../../../../../../util/trace';
import { EARN_EXPERIENCES } from '../../../constants/experiences';
import useTronStakeApy from '../../../hooks/useTronStakeApy';
import styleSheet from './TronStakingLearnMoreModal.styles';
import {
  LearnMoreModalFooter,
  StakingInfoBodyText,
  StakingInfoStrings,
} from '../../../../Stake/components/LearnMoreModal';

const TRON_STAKING_FAQ_URL =
  'https://support.metamask.io/metamask-portfolio/move-crypto/stake/';

const TronStakingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);

  const { apyPercent, isLoading } = useTronStakeApy();

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  useEffect(() => {
    trace({
      name: TraceName.EarnFaqApys,
      data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
    });
    endTrace({ name: TraceName.EarnFaq });
  }, []);

  useEffect(() => {
    if (!isLoading && apyPercent) {
      endTrace({ name: TraceName.EarnFaqApys });
    }
  }, [isLoading, apyPercent]);

  const bodyTextStrings: StakingInfoStrings = useMemo(
    () => ({
      stakeAnyAmount: strings('stake.trx_learn_more.stake_any_amount'),
      noMinimumRequired: strings('stake.no_minimum_required'),
      earnRewards: strings('stake.trx_learn_more.earn_trx_rewards'),
      earnRewardsDescription: strings(
        'stake.trx_learn_more.earn_trx_rewards_description',
      ),
      flexibleUnstaking: strings('stake.flexible_unstaking'),
      flexibleUnstakingDescription: strings(
        'stake.trx_learn_more.flexible_unstaking_description',
      ),
      disclaimer: strings('stake.disclaimer'),
    }),
    [],
  );

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <ScrollView bounces={false}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingSM}>
            {strings('stake.trx_learn_more.title')}
          </Text>
        </BottomSheetHeader>
        {apyPercent && (
          <View style={styles.apyContainer}>
            <Text variant={TextVariant.DisplayMD} color={TextColor.Success}>
              {apyPercent}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('stake.apr')}
            </Text>
          </View>
        )}
        <StakingInfoBodyText strings={bodyTextStrings} styles={styles} />
      </ScrollView>
      <LearnMoreModalFooter
        onClose={handleClose}
        learnMoreUrl={TRON_STAKING_FAQ_URL}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default TronStakingLearnMoreModal;
