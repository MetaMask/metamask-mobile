import React, { useEffect } from 'react';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { strings } from '../../../../../../../../locales/i18n';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';

const StablecoinLendingDeposit = () => {
  useNavbar(strings('earn.deposit'), true);
  useClearConfirmationOnBackSwipe();
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return <Text>Hello World</Text>;
};

export default StablecoinLendingDeposit;