import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { trace, TraceName } from '../../../../util/trace';
import { sleep } from '../../../../util/testUtils';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';

function GenerateTrace() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleGenerateTraceTest = useCallback(async () => {
    await trace(
      {
        name: TraceName.DeveloperTest,
        data: { 'test.data.number': 123 },
        tags: { 'test.tag.number': 123 },
      },
      async (context) => {
        await trace(
          {
            name: TraceName.NestedTest1,
            data: { 'test.data.boolean': true },
            tags: { 'test.tag.boolean': true },
            parentContext: context,
          },
          () => sleep(1000),
        );

        await trace(
          {
            name: TraceName.NestedTest2,
            data: { 'test.data.string': 'test' },
            tags: { 'test.tag.string': 'test' },
            parentContext: context,
          },
          () => sleep(500),
        );
      },
    );
  }, []);

  return (
    <>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.generate_trace_test_desc')}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={strings('app_settings.developer_options.generate_trace_test')}
        onPress={handleGenerateTraceTest}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </>
  );
}

export default function SentryTest() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'Sentry'}
      </Text>
      <GenerateTrace />
    </>
  );
}
