import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { getSessionProfileId } from '../../../../../util/notifications/utils/get-session-profile-id';
import MockKycProgressBar from './MockKycProgressBar';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';
import { NeobankWebSocket } from './neobank/NeobankWebSocket';
import {
  DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
  DEMO_AUTORAMP_DESTINATION_TOKEN,
  DEMO_AUTORAMP_SOURCE_CURRENCY_CODE,
} from './constants';
import {
  abbreviate,
  describeError,
  traceWhilePending,
  vbaTrace,
} from '../../debug/vbaTrace';
import { useVbaKycTrace } from './hooks/useVbaKycTrace';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';

type StepId = 'identity' | 'customer' | 'signing' | 'autoramp' | 'live';

type StepStatus = 'idle' | 'running' | 'waiting' | 'success' | 'failed';

interface StepState {
  status: StepStatus;
  detail?: string;
  ms?: number;
}

/**
 * The stages the demo makes visible. `caller` is the actual code path or HTTP
 * route each stage exercises, shown verbatim so the audience can follow along
 * with the network tab / API logs.
 */
const STEPS: { id: StepId; title: string; caller: string }[] = [
  {
    id: 'identity',
    title: 'Resolve wallet identity',
    caller: 'AuthenticationController.getSessionProfile()',
  },
  {
    id: 'customer',
    title: 'Map identity to MoonPay customer',
    caller: 'RampsController.provisionMoneyAccount (KYC / Profile Sync)',
  },
  {
    id: 'signing',
    title: 'Sign wallet ownership',
    caller: 'RampsController.provisionMoneyAccount',
  },
  {
    id: 'autoramp',
    title: 'Create the autoramp',
    caller: 'RampsController.provisionMoneyAccount',
  },
  {
    id: 'live',
    title: 'Listen for status updates',
    caller: 'MoonPay webhook -> API -> WebSocket',
  },
];

const IDLE_STEPS: Record<StepId, StepState> = {
  identity: { status: 'idle' },
  customer: { status: 'idle' },
  signing: { status: 'idle' },
  autoramp: { status: 'idle' },
  live: { status: 'idle' },
};

const STATUS_LABELS: Record<StepStatus, string> = {
  idle: 'Queued',
  running: 'Running',
  waiting: 'Listening',
  success: 'Done',
  failed: 'Failed',
};

const STATUS_SEVERITIES: Record<StepStatus, TagSeverity> = {
  idle: TagSeverity.Neutral,
  running: TagSeverity.Info,
  waiting: TagSeverity.Info,
  success: TagSeverity.Success,
  failed: TagSeverity.Danger,
};

/**
 * Shortens long opaque ids (profile ids, customer ids) so a whole row still
 * fits on a phone screen while staying recognizable on a projector.
 */
function truncateId(value: string): string {
  return value.length <= 16 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Renders one pipeline stage: a status indicator, the human-readable stage
 * name, the code path or route it exercises, and its result once known.
 */
const StepRow = ({
  step,
  state,
  isLast,
}: {
  step: { id: StepId; title: string; caller: string };
  state: StepState;
  isLast: boolean;
}) => {
  const { status } = state;

  return (
    <Box twClassName={isLast ? '' : 'border-b border-muted pb-3 mb-3'}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="h-7 w-7 items-center justify-center rounded-full bg-muted"
        >
          {status === 'running' || status === 'waiting' ? (
            <ActivityIndicator size="small" />
          ) : (
            <Icon
              name={
                status === 'success'
                  ? IconName.Confirmation
                  : status === 'failed'
                    ? IconName.Danger
                    : IconName.Clock
              }
              size={IconSize.Sm}
              color={
                status === 'success'
                  ? IconColor.SuccessDefault
                  : status === 'failed'
                    ? IconColor.ErrorDefault
                    : IconColor.IconMuted
              }
            />
          )}
        </Box>

        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {step.title}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {step.caller}
          </Text>
        </Box>

        <Box alignItems={BoxAlignItems.End} twClassName="gap-1">
          <Tag severity={STATUS_SEVERITIES[status]}>
            {STATUS_LABELS[status]}
          </Tag>
          {state.ms === undefined ? null : (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {`${state.ms}ms`}
            </Text>
          )}
        </Box>
      </Box>

      {state.detail ? (
        <Box
          twClassName={`mt-2 ml-10 rounded-md p-2 ${
            status === 'failed' ? 'bg-error-muted' : 'bg-alternative'
          }`}
        >
          <Text variant={TextVariant.BodyXs}>{state.detail}</Text>
        </Box>
      ) : null}
    </Box>
  );
};

/**
 * Demo-only KYC success screen.
 *
 * Resolves the wallet's Profile Sync identity for display, then calls
 * `RampsController.provisionMoneyAccount` (KYC-gated wallet registration +
 * autoramp create). That method is idempotent with the KYC `completed` event
 * path, so this pull still works when status was already completed before
 * mount. A websocket then stays open so MoonPay webhook pushes land live.
 */
const MockKycSuccess = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedInternalAccountAddress);

  const [steps, setSteps] = useState<Record<StepId, StepState>>(IDLE_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [autorampId, setAutorampId] = useState<string | null>(null);
  const [pushCount, setPushCount] = useState(0);
  const isMountedRef = useRef(true);

  useVbaKycTrace('MockKycSuccess');

  const updateStep = useCallback((id: StepId, next: StepState) => {
    setSteps((current) => ({ ...current, [id]: next }));
  }, []);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      vbaTrace('pipeline.unmount', { socket: 'disconnecting' });
      NeobankWebSocket.getInstance().disconnect();
    },
    [],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRun = useCallback(async () => {
    setSteps(IDLE_STEPS);
    setAutorampId(null);
    setPushCount(0);
    setIsRunning(true);

    vbaTrace('pipeline.run.start', {
      walletAddress: abbreviate(walletAddress),
      destinationBlockchain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
      destinationToken: DEMO_AUTORAMP_DESTINATION_TOKEN,
      sourceCurrency: DEMO_AUTORAMP_SOURCE_CURRENCY_CODE,
    });

    const timed = async <Result,>(
      id: StepId,
      work: () => Promise<Result>,
    ): Promise<Result> => {
      updateStep(id, { status: 'running' });
      const startedAt = Date.now();
      vbaTrace('pipeline.stage.start', { stage: id });
      const stopPendingReports = traceWhilePending('pipeline.stage.pending', {
        stage: id,
      });
      try {
        const result = await work();
        const ms = Date.now() - startedAt;
        updateStep(id, { status: 'success', ms });
        vbaTrace('pipeline.stage.success', { stage: id, durationMs: ms });
        return result;
      } catch (error) {
        const ms = Date.now() - startedAt;
        updateStep(id, {
          status: 'failed',
          ms,
          detail: errorMessageOf(error),
        });
        vbaTrace('pipeline.stage.failed', {
          stage: id,
          durationMs: ms,
          error: describeError(error),
        });
        throw error;
      } finally {
        stopPendingReports();
      }
    };

    try {
      if (!walletAddress) {
        throw new Error('No wallet address is selected.');
      }

      const profileId = await timed('identity', async () => {
        const resolved = await getSessionProfileId();
        if (!resolved) {
          throw new Error(
            'Wallet is not signed in to Profile Sync, so it has no profile id.',
          );
        }
        return resolved;
      });
      updateStep('identity', {
        status: 'success',
        detail: `externalId = ${truncateId(profileId)}`,
      });

      vbaTrace('identity.resolved', {
        externalId: profileId,
        source: 'AuthenticationController.getSessionProfile',
      });

      const provisioned = await timed('signing', async () => {
        vbaTrace('provision.start', {
          source: 'pipeline',
          address: abbreviate(walletAddress),
        });
        const result =
          await Engine.context.RampsController.provisionMoneyAccount({
            address: walletAddress,
            autoramp: buildMoneyAccountAutorampParams(walletAddress),
          });
        vbaTrace('provision.success', {
          autorampId: result.autoramp.id,
          status: result.autoramp.status,
          registrationType: result.registration.type,
        });
        return result;
      });

      if (!isMountedRef.current) {
        return;
      }

      updateStep('customer', {
        status: 'success',
        detail: `customer_id = ${truncateId(provisioned.autoramp.customerId)}`,
      });
      updateStep('signing', {
        status: 'success',
        detail: `${provisioned.registration.type} · chain = ${DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN}`,
      });

      setAutorampId(provisioned.autoramp.id);
      updateStep('autoramp', {
        status: 'success',
        detail: `id = ${truncateId(provisioned.autoramp.id)} · status = ${provisioned.autoramp.status}`,
      });

      const socket = NeobankWebSocket.getInstance();
      socket.connect();
      vbaTrace('push.subscribe', { autorampId: provisioned.autoramp.id });
      updateStep('live', {
        status: 'waiting',
        detail:
          'Socket open. Move the autoramp forward in the MoonPay dashboard to see a push land here.',
      });
      socket.addListener(({ remote }) => {
        vbaTrace('push.received', {
          autorampId: remote.id,
          customerId: remote.customerId,
          status: remote.status,
          isMounted: isMountedRef.current,
        });
        if (!isMountedRef.current) {
          return;
        }
        setPushCount((count) => count + 1);
        updateStep('live', {
          status: 'success',
          detail: `${remote.status} received at ${new Date().toLocaleTimeString()}`,
        });
      });
    } catch (error) {
      // Each stage already recorded its own failure detail.
      vbaTrace('pipeline.run.stopped', { error: describeError(error) });
    } finally {
      if (isMountedRef.current) {
        setIsRunning(false);
      }
    }
  }, [updateStep, walletAddress]);

  const handleViewAccount = useCallback(
    () => navigation.navigate(Routes.RAMP.VBA_ACCOUNT),
    [navigation],
  );

  const hasFailure = Object.values(steps).some(
    (step) => step.status === 'failed',
  );
  const hasStarted = Object.values(steps).some(
    (step) => step.status !== 'idle',
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        title={strings('virtual_bank_account.mock_kyc.success.navbar_title')}
        onBack={handleBack}
        backButtonProps={{ testID: MockKycSuccessSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <MockKycProgressBar filledCount={2} />

      <ScrollView
        contentContainerStyle={tw.style('gap-4 px-4 pb-6 pt-2')}
        testID={MockKycSuccessSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-2">
          <AvatarIcon
            iconName={IconName.Confirmation}
            size={AvatarIconSize.Xl}
          />
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            Identity verified
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            Creating your account runs five real steps. Watch each one report
            back below.
          </Text>
        </Box>

        <Box twClassName="rounded-xl border border-muted p-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-3 justify-between"
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              What you&apos;re about to create
            </Text>
            <Tag severity={TagSeverity.Info}>Autoramp</Tag>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {`Any ${DEMO_AUTORAMP_SOURCE_CURRENCY_CODE} Pix deposit converts to ${DEMO_AUTORAMP_DESTINATION_TOKEN} on ${DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN} and lands in:`}
          </Text>
          <Text variant={TextVariant.BodyXs} twClassName="mt-1">
            {walletAddress ?? 'No wallet selected'}
          </Text>
        </Box>

        <Box twClassName="rounded-xl border border-muted p-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-3 justify-between"
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              Pipeline
            </Text>
            {pushCount > 0 ? (
              <Tag severity={TagSeverity.Success}>
                {`${pushCount} live push${pushCount === 1 ? '' : 'es'}`}
              </Tag>
            ) : null}
          </Box>

          {STEPS.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              state={steps[step.id]}
              isLast={index === STEPS.length - 1}
            />
          ))}
        </Box>

        {hasFailure ? (
          <Box twClassName="rounded-xl bg-error-muted p-4">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              Pipeline stopped
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="mt-1">
              The failing step above shows the upstream response from
              RampsController.provisionMoneyAccount.
            </Text>
          </Box>
        ) : null}
      </ScrollView>

      <Box twClassName="gap-3 border-t border-muted p-4">
        {autorampId ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleViewAccount}
          >
            View bank account
          </Button>
        ) : null}
        <Button
          variant={autorampId ? ButtonVariant.Secondary : ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleRun}
          isDisabled={isRunning}
          isLoading={isRunning}
          testID={MockKycSuccessSelectorsIDs.FINISH_BUTTON}
        >
          {hasStarted && !isRunning ? 'Run again' : 'Create my account'}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default MockKycSuccess;
