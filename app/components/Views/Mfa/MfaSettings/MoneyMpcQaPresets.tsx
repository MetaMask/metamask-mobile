import React, { useState, useSyncExternalStore } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import { bytesToHex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { setMpcTwoFactorTokenProvider } from '../../../../core/MpcMoneyKeyring/mpc-money-keyring-builder';
import { describeError } from '../../../../util/describeError';
import { useMfa } from '../../../../util/identity/mfa';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';
import { moneyAccountMigration } from '../../../../lib/Money/mfa/moneyAccountMigration';
import { MONEY_MFA_METHODS } from '../../../UI/Money/hooks/useMoneyMfa';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';

type Mfa = ReturnType<typeof useMfa>;

const TEST_MESSAGE = 'MetaMask Money MPC test';

const getMpcMoneyAddress = () => {
  const { defaultMoneyAccountId, moneyAccounts } =
    Engine.context.MoneyAccountController.state;
  const account = defaultMoneyAccountId
    ? moneyAccounts[defaultMoneyAccountId]
    : undefined;
  return account?.options.entropy.type === KeyringAccountEntropyTypeOption.Mpc
    ? account.address
    : undefined;
};

const verifyWith = (mfa: Mfa, methods: MfaMethod[]) => async () => {
  const { token } = await mfa.verifyOrEnroll({
    methods,
    verifyWith: methods,
    reason: {
      operation: 'qa.moneyMpcSign',
      enrollDescription: 'QA preset: Money MPC signing',
      verifyDescription: 'QA preset: Money MPC signing',
    },
  });
  if (!token) {
    throw new Error('No verification token');
  }
  return token.accessToken;
};

const signTestMessage = async (): Promise<string> => {
  const address = getMpcMoneyAddress();
  if (!address) {
    throw new Error('No MPC Money account, create one first');
  }
  const data = bytesToHex(new TextEncoder().encode(TEST_MESSAGE));
  const signature = await Engine.context.KeyringController.signPersonalMessage({
    from: address,
    data,
  });
  const recovered = recoverPersonalSignature({ data, signature });
  return `${signature}\nRecovers to the account: ${
    recovered.toLowerCase() === address.toLowerCase()
  }`;
};

/**
 * Non-production buttons that create the MPC Money account and sign with it.
 */
const MoneyMpcQaPresets = () => {
  const mfa = useMfa();
  const [result, setResult] = useState<string>();
  const lastMigrationError = useSyncExternalStore(
    moneyAccountMigration.subscribe,
    moneyAccountMigration.getLastError,
  );

  const run = async (label: string, action: () => Promise<string>) => {
    setResult(`${label}: running`);
    const startedAt = Date.now();
    try {
      const output = await action();
      setResult(`${label}: done in ${Date.now() - startedAt}ms\n${output}`);
    } catch (error) {
      setResult(`${label}: failed. ${describeError(error)}`);
    }
  };

  const create = () =>
    run('Create MPC Money account', async () => {
      moneyAccountMigration.reset();
      await moneyAccountMigration.start();
      return getMpcMoneyAddress() ?? '';
    });

  const sign = (label: string, provider?: () => Promise<string>) =>
    run(label, async () => {
      setMpcTwoFactorTokenProvider(provider);
      try {
        return await signTestMessage();
      } finally {
        setMpcTwoFactorTokenProvider(undefined);
      }
    });

  const presets = [
    { label: 'Create MPC Money account', onPress: create },
    {
      label: 'Sign test message',
      onPress: () => sign('Sign test message'),
    },
    {
      label: 'Sign with 2FA (passkey or authenticator app)',
      onPress: () =>
        sign(
          'Sign with 2FA (passkey or authenticator app)',
          verifyWith(mfa, MONEY_MFA_METHODS),
        ),
    },
    {
      label: 'Sign with 2FA (authenticator app)',
      onPress: () =>
        sign('Sign with 2FA (authenticator app)', verifyWith(mfa, ['totp'])),
    },
  ];

  return (
    <Box
      twClassName="px-4 pt-4 pb-8 gap-3"
      testID={MfaSettingsSelectorsIDs.MONEY_MPC_QA}
    >
      <Text variant={TextVariant.HeadingSm}>Money MPC (non-production)</Text>
      {presets.map(({ label, onPress }) => (
        <Button
          key={label}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          isFullWidth
          onPress={onPress}
        >
          {label}
        </Button>
      ))}
      {result ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          selectable
          testID={MfaSettingsSelectorsIDs.MONEY_MPC_QA_RESULT}
        >
          {result}
        </Text>
      ) : null}
      {lastMigrationError ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          selectable
          testID={MfaSettingsSelectorsIDs.MONEY_MPC_QA_LAST_MIGRATION_ERROR}
        >
          {`Last migration error: ${lastMigrationError}`}
        </Text>
      ) : null}
    </Box>
  );
};

export default MoneyMpcQaPresets;
