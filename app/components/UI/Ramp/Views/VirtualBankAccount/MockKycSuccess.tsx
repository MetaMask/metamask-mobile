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

type StepId = 'identity' | 'customer' | 'autoramp' | 'live';

type StepStatus = 'idle' | 'running' | 'waiting' | 'success' | 'failed';

type StepState = {
  status: StepStatus;
  detail?: string;
  ms?: number;
};

/**
 * The four stages the demo makes visible. `caller` is the actual code path or
 * HTTP route each stage exercises, shown verbatim so the audience can follow
 * along with the network tab / API logs.
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
    caller: 'GET /neobank/customers/{externalId}/external',
  },
  {
    id: 'autoramp',
    title: 'Create the autoramp',
    caller: 'POST /neobank/autoramps',
  },
  {
    id: 'live',
    title: 'Listen for status updates',
    caller: 'MoonPay webhook → API → WebSocket',
  },
];

const IDLE_STEPS: Record<StepId, StepState> = {
  identity: { status: 'idle' },
  customer: { status: 'idle' },
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
 * Reads the MoonPay customer id out of the neo-bank proxy's passthrough of
 * MoonPay's `Customer` object.
 */
function readCustomerId(customer: unknown): string | null {
  if (customer && typeof customer === 'object') {
    const { id } = customer as { id?: unknown };
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return null;
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
 * Rather than hiding the work behind a single spinner, this screen runs the
 * autoramp creation pipeline stage by stage and reports each one: resolving the
 * wallet's Profile Sync identity, mapping it to a MoonPay customer, creating
 * the autoramp, then holding a websocket open so MoonPay webhook pushes land
 * live. Failures surface the upstream message in place, which is what makes
 * this useful while the proxy routes are still being built out.
 *
 * The MoonPay `customer_id` is never passed from here: `createAutoramp`
 * resolves it itself. Stage 2 performs the same lookup only so the mapping is
 * observable during the demo.
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

  const updateStep = useCallback((id: StepId, next: StepState) => {
    setSteps((current) => ({ ...current, [id]: next }));
  }, []);

  useEffect(
    () => () => {
      isMountedRef.current = false;
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

    const timed = async <Result,>(
      id: StepId,
      work: () => Promise<Result>,
    ): Promise<Result> => {
      updateStep(id, { status: 'running' });
      const startedAt = Date.now();
      try {
        const result = await work();
        updateStep(id, { status: 'success', ms: Date.now() - startedAt });
        return result;
      } catch (error) {
        updateStep(id, {
          status: 'failed',
          ms: Date.now() - startedAt,
          detail: errorMessageOf(error),
        });
        throw error;
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

      const customerId = await timed('customer', async () => {
        const customer =
          await Engine.context.NeoBankService.getCustomerByExternalId(profileId);
        const resolved = readCustomerId(customer);
        if (!resolved) {
          throw new Error(
            'Proxy responded without a customer id for this external id.',
          );
        }
        return resolved;
      });
      updateStep('customer', {
        status: 'success',
        detail: `customer_id = ${truncateId(customerId)}`,
      });

      const account = await timed('autoramp', async () =>
        Engine.context.RampsController.createAutoramp({
          source_currencies: [
            { type: 'Fiat', code: DEMO_AUTORAMP_SOURCE_CURRENCY_CODE },
          ],
          destination_currency: {
            type: 'Crypto',
            token: DEMO_AUTORAMP_DESTINATION_TOKEN,
            blockchain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
          },
          recipient_account: {
            type: 'Crypto',
            chain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
            address: walletAddress,
          },
          source_is_third_party: false,
        }),
      );

      if (!isMountedRef.current) {
        return;
      }

      setAutorampId(account.id);
      updateStep('autoramp', {
        status: 'success',
        detail: `id = ${truncateId(account.id)} · status = ${account.status}`,
      });

      const socket = NeobankWebSocket.getInstance();
      socket.connect();
      updateStep('live', {
        status: 'waiting',
        detail:
          'Socket open. Move the autoramp forward in the MoonPay dashboard to see a push land here.',
      });
      socket.addListener(({ remote }) => {
        if (!isMountedRef.current) {
          return;
        }
        setPushCount((count) => count + 1);
        updateStep('live', {
          status: 'success',
          detail: `${remote.status} received at ${new Date().toLocaleTimeString()}`,
        });
      });
    } catch {
      // Each stage already recorded its own failure detail.
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
            Creating your account runs four real steps. Watch each one report
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
              The failing step above shows the upstream response. A 404 on the
              customer lookup means MoonPay has no customer registered against
              this wallet&apos;s external id yet.
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
