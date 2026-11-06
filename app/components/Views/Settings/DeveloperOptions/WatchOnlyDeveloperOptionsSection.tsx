import React, { useCallback, useState } from 'react';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

/**
 * Development-only entry point: adds an EVM address as a watch-only account
 * and selects it, so a developer sees the app as that account. Rendered only
 * when the watch-only build gate is on.
 */
const WatchOnlyDeveloperOptionsSection = () => {
  const [address, setAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [result, setResult] = useState<string>();

  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    setResult(undefined);
    try {
      const { WatchOnlyAccountService, AccountTreeController } = Engine.context;
      // The section only renders when the build gate constructs the service.
      if (!WatchOnlyAccountService) {
        throw new Error('Watch-only accounts are disabled in this build.');
      }
      const account = await WatchOnlyAccountService.createAccount(
        address.trim(),
      );
      AccountTreeController.setSelectedAccountGroupByAccountId(account.id);
      // Account names live on the account tree group, not on the account.
      const groupId = AccountTreeController.getAccountContext(
        account.id,
      )?.groupId;
      const name =
        (groupId &&
          AccountTreeController.getAccountGroupObject(groupId)?.metadata
            .name) ||
        account.address;
      setResult(
        strings('app_settings.developer_options.watch_only.added', { name }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(
        error instanceof Error ? error : new Error(message),
        'WatchOnlyDeveloperOptionsSection: add watch-only account failed',
      );
      setResult(
        strings('app_settings.developer_options.watch_only.add_error', {
          message,
        }),
      );
    } finally {
      setIsAdding(false);
    }
  }, [address]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        twClassName="mt-4"
      >
        {strings('app_settings.developer_options.watch_only.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        twClassName="mt-2"
      >
        {strings('app_settings.developer_options.watch_only.description')}
      </Text>
      <TextField
        value={address}
        onChangeText={setAddress}
        placeholder={strings(
          'app_settings.developer_options.watch_only.address_placeholder',
        )}
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          testID: DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT,
        }}
        twClassName="mt-4"
      />
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleAdd}
        isDisabled={!address.trim() || isAdding}
        isLoading={isAdding}
        isFullWidth
        twClassName="mt-4"
        testID={DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON}
      >
        {strings('app_settings.developer_options.watch_only.add_button')}
      </Button>
      {result ? (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          twClassName="mt-2"
          testID={DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT}
        >
          {result}
        </Text>
      ) : null}
    </>
  );
};

export default WatchOnlyDeveloperOptionsSection;
