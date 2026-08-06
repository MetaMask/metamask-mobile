import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { trace, TraceName } from '../../../../util/trace';
import { sleep } from '../../../../util/testUtils';
import { useStyles } from '../../../../component-library/hooks';
import {
  reportStorageWriteError,
  resetDiskSpaceErrorSessionStateForTesting,
} from '../../../../util/storage/diskSpaceError';
import styleSheet from './DeveloperOptions.styles';

const DISK_FULL_SIMULATE_TEST_ID = 'sentry-disk-full-simulate-button';
const DISK_FULL_RESET_TEST_ID = 'sentry-disk-full-reset-button';

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

function SimulateDiskFull() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleSimulateDiskFull = useCallback(() => {
    const diskFullError = new Error(
      'NSCocoaErrorDomain Code=640 "You can’t save the file because the volume is out of space."',
    );

    // Fire twice with different keys — alert + Sentry should only trigger once.
    reportStorageWriteError(diskFullError, {
      message: 'Failed to set item for persist:root',
      key: 'persist:root',
      source: 'persist_storage',
    });
    reportStorageWriteError(diskFullError, {
      message: 'Failed to set item for persist:AssetsController',
      key: 'persist:AssetsController',
      source: 'persist_storage',
    });
  }, []);

  const handleResetDiskFullSession = useCallback(() => {
    resetDiskSpaceErrorSessionStateForTesting();
  }, []);

  return (
    <>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.simulate_disk_full_desc')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleSimulateDiskFull}
        isFullWidth
        style={styles.accessory}
        testID={DISK_FULL_SIMULATE_TEST_ID}
      >
        {strings('app_settings.developer_options.simulate_disk_full')}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleResetDiskFullSession}
        isFullWidth
        style={styles.accessory}
        testID={DISK_FULL_RESET_TEST_ID}
      >
        {strings('app_settings.developer_options.reset_disk_full_session')}
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
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'Sentry'}
      </Text>
      <GenerateTrace />
      <SimulateDiskFull />
    </>
  );
}
