import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
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
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import Engine from '../../../../core/Engine';
import type { ChompApiService as ChompApiServiceType } from '@metamask-previews/chomp-api-service';
import AppConstants from '../../../../core/AppConstants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_HEX = '0x0' as const;
const TAG = '[ChompApiTest]';

// Temporarily intercept fetch for CHOMP API requests to log full details

function getService(): ChompApiServiceType {
  const { ChompApiService } = Engine.context;
  if (!ChompApiService) {
    throw new Error('ChompApiService is not initialised');
  }
  return ChompApiService;
}

function showResult(title: string, result: unknown) {
  Alert.alert(title, JSON.stringify(result, null, 2));
}

function showError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { httpStatus?: number })?.httpStatus;
  Alert.alert(`${title}${status ? ` (${status})` : ''}`, message);
}

interface TestButtonProps {
  label: string;
  description: string;
  onPress: () => Promise<void>;
}

function TestButton({ label, description, onPress }: TestButtonProps) {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      await onPress();
    } finally {
      setLoading(false);
    }
  }, [onPress]);

  return (
    <>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {description}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handlePress}
        isFullWidth
        style={styles.accessory}
        isLoading={loading}
      >
        {label}
      </Button>
    </>
  );
}

export default function ChompApiTest() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const inspectToken = useCallback(async () => {
    try {
      const { AuthenticationController } = Engine.context;
      const token = await AuthenticationController?.getBearerToken();
      if (!token) {
        Alert.alert('Token', 'No bearer token available');
        return;
      }
      // Decode JWT payload (base64url -> JSON)
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));
      Alert.alert('JWT Payload', JSON.stringify(payload, null, 2));
    } catch (error) {
      showError('inspectToken', error);
    }
  }, []);

  const testGetUpgrade = useCallback(async () => {
    try {
      const result = await getService().getUpgrade(ZERO_ADDRESS);
      showResult('getUpgrade', result);
    } catch (error) {
      showError('getUpgrade', error);
    }
  }, []);

  const testAssociateAddress = useCallback(async () => {
    try {
      const result = await getService().associateAddress({
        signature: '0xdead',
        timestamp: new Date().toISOString(),
        address: ZERO_ADDRESS,
      });
      showResult('associateAddress', result);
    } catch (error) {
      showError('associateAddress', error);
    }
  }, []);

  const testGetIntentsByAddress = useCallback(async () => {
    try {
      const result = await getService().getIntentsByAddress(ZERO_ADDRESS);
      showResult('getIntentsByAddress', result);
    } catch (error) {
      showError('getIntentsByAddress', error);
    }
  }, []);

  const testVerifyDelegation = useCallback(async () => {
    try {
      const result = await getService().verifyDelegation({
        signedDelegation: {
          delegate: ZERO_HEX,
          delegator: ZERO_HEX,
          authority: ZERO_HEX,
          caveats: [],
          salt: ZERO_HEX,
          signature: ZERO_HEX,
        },
        chainId: '0x1',
      });
      showResult('verifyDelegation', result);
    } catch (error) {
      showError('verifyDelegation', error);
    }
  }, []);

  const testCreateIntents = useCallback(async () => {
    try {
      const result = await getService().createIntents([
        {
          account: ZERO_HEX,
          delegationHash: ZERO_HEX,
          chainId: '0x1',
          metadata: {
            allowance: '0x0',
            tokenSymbol: 'USDC',
            tokenAddress: ZERO_HEX,
            type: 'cash-deposit',
          },
        },
      ]);
      showResult('createIntents', result);
    } catch (error) {
      showError('createIntents', error);
    }
  }, []);

  const testCreateUpgrade = useCallback(async () => {
    try {
      const result = await getService().createUpgrade({
        r: '0x0',
        s: '0x0',
        v: 27,
        yParity: 0,
        address: ZERO_ADDRESS,
        chainId: '0x1',
        nonce: '0x0',
      });
      showResult('createUpgrade', result);
    } catch (error) {
      showError('createUpgrade', error);
    }
  }, []);

  const testCreateWithdrawal = useCallback(async () => {
    try {
      const result = await getService().createWithdrawal({
        chainId: '0x1',
        amount: '0',
        account: ZERO_HEX,
      });
      showResult('createWithdrawal', result);
    } catch (error) {
      showError('createWithdrawal', error);
    }
  }, []);

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'CHOMP API Service'}
      </Text>
      <TestButton
        label="Inspect JWT"
        description="Decode and display the bearer token payload — check iss/aud to verify dev vs prod."
        onPress={inspectToken}
      />
      <TestButton
        label="getUpgrade"
        description="GET /v1/account-upgrade/:address — fetch upgrade record for zero address."
        onPress={testGetUpgrade}
      />
      <TestButton
        label="associateAddress"
        description="POST /v1/auth/address — associate zero address with dummy signature."
        onPress={testAssociateAddress}
      />
      <TestButton
        label="getIntentsByAddress"
        description="GET /v1/intent/account/:address — fetch intents for zero address."
        onPress={testGetIntentsByAddress}
      />
      <TestButton
        label="verifyDelegation"
        description="POST /v1/intent/verify-delegation — verify a dummy delegation."
        onPress={testVerifyDelegation}
      />
      <TestButton
        label="createIntents"
        description="POST /v1/intent — submit a dummy intent."
        onPress={testCreateIntents}
      />
      <TestButton
        label="createUpgrade"
        description="POST /v1/account-upgrade — submit a dummy upgrade request."
        onPress={testCreateUpgrade}
      />
      <TestButton
        label="createWithdrawal"
        description="POST /v1/withdrawal — submit a dummy withdrawal."
        onPress={testCreateWithdrawal}
      />
    </>
  );
}
