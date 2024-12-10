import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation } from '@react-navigation/native';
import { POOLED_STAKING_FAQ_URL } from '../../constants';
import styleSheet from './PoolStakingLearnMoreModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import VaultHistoricRewardsChart from './VaultHistoricRewardsChart';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

// TODO: Add Tests
// TODO: Make sure heading is aligned on Android devices.
const BodyText = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.bodyTextContainer}>
      <Text variant={TextVariant.BodyMDMedium}>
        Stake any amount of ETH.{' '}
        <Text color={TextColor.Alternative}>No minimum required.</Text>
      </Text>
      <Text variant={TextVariant.BodyMDMedium}>
        Earn ETH rewards.{' '}
        <Text color={TextColor.Alternative}>
          Start earning as soon as you stake. Rewards compound automatically.
        </Text>
      </Text>
      <Text variant={TextVariant.BodyMDMedium}>
        Flexible unstaking.{' '}
        <Text color={TextColor.Alternative}>
          Unstake anytime. Typically takes up to 11 days to process.
        </Text>
      </Text>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        style={styles.italicText}
      >
        Staking does not guarantee rewards, and involves risks including a loss
        of funds.
      </Text>
    </View>
  );
};

// TODO: Replace hardcoded text
const PoolStakingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const { trackEvent, createEventBuilder } = useMetrics();

  const { navigate } = useNavigation();

  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const redirectToLearnMore = () => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: POOLED_STAKING_FAQ_URL,
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED)
        .addProperties({
          selected_provider: 'consensys',
          text: 'Learn More',
          location: 'Learn More Modal',
        })
        .build(),
    );
  };

  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          Learn more
        </Text>
      ),
      size: ButtonSize.Lg,
      onPress: redirectToLearnMore,
    },
    {
      variant: ButtonVariants.Primary,
      label: (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
          Got it
        </Text>
      ),
      size: ButtonSize.Lg,
      onPress: handleClose,
    },
  ];

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <View>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingSM}>Stake ETH and earn</Text>
        </BottomSheetHeader>
        <VaultHistoricRewardsChart />
        <BodyText />
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default PoolStakingLearnMoreModal;
