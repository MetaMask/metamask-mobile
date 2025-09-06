import React from 'react';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import styleSheet from './SampleCounterPane.styles';
import { useSampleCounter } from '../../hooks/useSampleCounter/useSampleCounter';
import { strings } from '../../../../../../locales/i18n';
import Card from '../../../../../component-library/components/Cards/Card';
import { useStyles } from '../../../../../component-library/hooks';
import useMetrics from '../../../../../components/hooks/useMetrics/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { SAMPLE_FEATURE_EVENTS } from '../../../analytics/events';

/**
 * SampleCounterPane Component
 *
 * A demonstration component that implements a simple counter functionality.
 * This component showcases the use of custom hooks, state management, and
 * internationalization in the MetaMask mobile app.
 *
 * @component
 * @example
 * ```tsx
 * <SampleCounterPane />
 * ```
 *
 * @remarks
 * This is a sample feature and should not be used in production code.
 * It demonstrates:
 * - Custom hook usage (useSampleCounter)
 * - State management
 * - Internationalization
 * - Component composition
 * - Testing patterns
 *
 * @sampleFeature do not use in production code
 *
 * @returns A card containing a counter display and increment button
 */
export function SampleCounterPane() {
  const { styles } = useStyles(styleSheet, {});
  const counter = useSampleCounter();
  const { trackEvent } = useMetrics();

  const incrementCount = () => {
    trackEvent(
      MetricsEventBuilder.createEventBuilder(
        SAMPLE_FEATURE_EVENTS.COUNTER_INCREMENTED,
      ).build(),
    );
    counter.incrementCount();
  };

  return (
    <Card style={styles.card}>
      <Text variant={TextVariant.HeadingSM} testID="sample-counter-pane-title">
        {strings('sample_feature.counter.title')}
      </Text>
      <Text testID="sample-counter-pane-value">
        {strings('sample_feature.counter.value', { value: counter.count })}
      </Text>

      <Button
        variant={ButtonVariants.Primary}
        style={styles.button}
        onPress={incrementCount}
        testID="sample-counter-pane-increment-button"
        label={strings('sample_feature.counter.increment')}
      />
    </Card>
  );
}
