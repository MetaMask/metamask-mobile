import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.generate_trace_test_desc')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleGenerateTraceTest}
        isFullWidth
        style={styles.accessory}
      >
        {strings('app_settings.developer_options.generate_trace_test')}
      </Button>
    </>
  );
}

export default function SentryTest() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {'Sentry'}
      </Text>
      <GenerateTrace />
    </>
  );
}
