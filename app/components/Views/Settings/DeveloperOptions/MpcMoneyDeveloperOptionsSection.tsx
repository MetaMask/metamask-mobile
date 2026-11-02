import React, { useCallback, useState } from 'react';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import { bytesToHex } from '@metamask/utils';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import { MpcMoneyDeveloperOptionsSelectorsIDs } from './MpcMoneyDeveloperOptions.testIds';
import styleSheet from './DeveloperOptions.styles';

const TEST_MESSAGE = 'MetaMask Money MPC test';

const getMpcMoneyAddress = () => {
  const { moneyAccounts } = Engine.context.MoneyAccountController.state;
  const account = Object.values(moneyAccounts).find(
    ({ options }) =>
      options.entropy?.type === KeyringAccountEntropyTypeOption.Mpc,
  );
  return account?.address;
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Non-production buttons that create the MPC Money account and sign with it.
 * Only rendered when the real MPC keyring build flag is on.
 */
export const MpcMoneyDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [result, setResult] = useState<string>();

  const run = useCallback(
    async (label: string, action: () => Promise<string>) => {
      setResult(`${label}: running`);
      const startedAt = Date.now();
      try {
        const output = await action();
        setResult(`${label}: done in ${Date.now() - startedAt}ms\n${output}`);
      } catch (error) {
        setResult(`${label}: failed. ${describeError(error)}`);
      }
    },
    [],
  );

  const create = useCallback(
    () =>
      run('Create MPC Money account', async () => {
        const account =
          await Engine.context.MoneyAccountController.createMoneyAccount({
            type: KeyringAccountEntropyTypeOption.Mpc,
          });
        return account.address;
      }),
    [run],
  );

  const sign = useCallback(
    () =>
      run('Sign test message', async () => {
        const address = getMpcMoneyAddress();
        if (!address) {
          throw new Error('No MPC Money account, create one first');
        }
        const data = bytesToHex(new TextEncoder().encode(TEST_MESSAGE));
        const signature =
          await Engine.context.KeyringController.signPersonalMessage({
            from: address,
            data,
          });
        const recovered = recoverPersonalSignature({ data, signature });
        return `${signature}\nRecovers to the account: ${
          recovered.toLowerCase() === address.toLowerCase()
        }`;
      }),
    [run],
  );

  return (
    <Box
      twClassName="gap-2"
      testID={MpcMoneyDeveloperOptionsSelectorsIDs.SECTION}
    >
      <Text variant={TextVariant.HeadingLg} style={styles.heading}>
        {'Money MPC (non-production)'}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={create}
        isFullWidth
        testID={MpcMoneyDeveloperOptionsSelectorsIDs.CREATE_BUTTON}
      >
        {'Create MPC Money account'}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={sign}
        isFullWidth
        testID={MpcMoneyDeveloperOptionsSelectorsIDs.SIGN_BUTTON}
      >
        {'Sign test message'}
      </Button>
      {result ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={styles.desc}
          selectable
          testID={MpcMoneyDeveloperOptionsSelectorsIDs.RESULT}
        >
          {result}
        </Text>
      ) : null}
    </Box>
  );
};
