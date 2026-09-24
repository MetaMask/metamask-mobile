import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  TextField,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import {
  selectIsSelectedAccountWatchOnly,
  selectSelectedAccountGroupEvmInternalAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { WatchOnlySession } from '../../../../core/WatchOnly/WatchOnlySession';
import styleSheet from './DeveloperOptions.styles';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

const WatchOnlyDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const account = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const isWatchOnly = useSelector(selectIsSelectedAccountWatchOnly);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const watchedAddress = isWatchOnly ? account?.address : undefined;

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleStart = useCallback(
    () => run(() => WatchOnlySession.start(address.trim())),
    [address, run],
  );
  const handleStop = useCallback(() => run(WatchOnlySession.stop), [run]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.watch_only.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {watchedAddress
          ? strings('app_settings.developer_options.watch_only.active', {
              address: watchedAddress,
            })
          : strings('app_settings.developer_options.watch_only.description')}
      </Text>
      <TextField
        value={address}
        onChangeText={setAddress}
        placeholder={strings(
          'app_settings.developer_options.watch_only.address_placeholder',
        )}
        isError={Boolean(error)}
        style={styles.accessory}
        inputProps={{
          testID: DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT,
          autoCapitalize: 'none',
          autoCorrect: false,
        }}
      />
      {error ? (
        <Text color={TextColor.ErrorDefault} variant={TextVariant.BodySm}>
          {error}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={handleStart}
        isDisabled={!address.trim()}
        isFullWidth
        style={styles.accessory}
        testID={DeveloperOptionsSelectorsIDs.WATCH_ONLY_START_BUTTON}
      >
        {strings('app_settings.developer_options.watch_only.start_button')}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleStop}
        isDisabled={!watchedAddress}
        isFullWidth
        style={styles.accessory}
        testID={DeveloperOptionsSelectorsIDs.WATCH_ONLY_STOP_BUTTON}
      >
        {strings('app_settings.developer_options.watch_only.stop_button')}
      </Button>
    </>
  );
};

export default WatchOnlyDeveloperOptionsSection;
