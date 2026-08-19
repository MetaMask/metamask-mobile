import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import {
  StepConnector,
  StepDot,
  StepFailureIcon,
  type StepDotStatus,
} from '../../../UI/StepTimeline';
import {
  useActivityBlockExplorer,
  type ActivityExplorerLink,
} from '../hooks/useActivityBlockExplorer';
import { ActivityDetailSection } from './ActivityDetailsLayout';
import { ActivityDetailsStepFailureSheet } from './ActivityDetailsStepFailureSheet';
import {
  getActivityDetailsStepFailureTestId,
  getActivityDetailsStepIconTestId,
  getActivityDetailsStepTestId,
} from '../ActivityDetails.testIds';

export type ActivityDetailsStepStatus =
  | 'completed'
  | 'pending'
  | 'failed'
  | 'upcoming';

export interface ActivityDetailsStep {
  label: string;
  subtext?: string;
  status: ActivityDetailsStepStatus;
  failureMessage?: string;
}

export interface ActivityDetailsStepExplorerTarget {
  chainId: string;
  hash: string;
}

/** Failed steps are drawn as a cross, so they have no dot status. */
const DOT_STATUS: Record<
  Exclude<ActivityDetailsStepStatus, 'failed'>,
  StepDotStatus
> = {
  completed: 'success',
  pending: 'warning',
  upcoming: 'muted',
};

function getStepTextColor(status: ActivityDetailsStepStatus): TextColor {
  return status === 'failed' ? TextColor.ErrorDefault : TextColor.TextDefault;
}

function getStepSubtextColor(status: ActivityDetailsStepStatus): TextColor {
  switch (status) {
    case 'failed':
      return TextColor.ErrorDefault;
    case 'pending':
      return TextColor.WarningDefault;
    case 'completed':
    case 'upcoming':
    default:
      return TextColor.TextAlternative;
  }
}

function useOpenExplorer(link: ActivityExplorerLink | undefined) {
  const navigation = useNavigation<AppNavigationProp>();

  return React.useCallback(() => {
    if (!link) {
      return;
    }

    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: link.url, title: link.title },
    });
  }, [link, navigation]);
}

export function ActivityDetailsStepTimeline({
  explorerTarget,
  steps,
  title,
}: {
  explorerTarget?: ActivityDetailsStepExplorerTarget;
  steps: ActivityDetailsStep[];
  title: string;
}) {
  const explorerLink = useActivityBlockExplorer(
    explorerTarget?.chainId,
    explorerTarget?.hash,
  );
  const openExplorer = useOpenExplorer(explorerLink);
  const [failureShown, setFailureShown] = React.useState<string | undefined>();
  const dismissFailure = React.useCallback(
    () => setFailureShown(undefined),
    [],
  );

  return (
    <ActivityDetailSection>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {title}
      </Text>
      <Box twClassName="gap-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const failureMessage =
            step.status === 'failed' ? step.failureMessage : undefined;

          return (
            <Pressable
              key={`${step.label}-${index}`}
              disabled={!failureMessage && !explorerLink}
              onPress={
                failureMessage
                  ? () => setFailureShown(failureMessage)
                  : openExplorer
              }
              testID={getActivityDetailsStepTestId(index)}
            >
              <Box twClassName="flex-row items-start gap-3">
                <Box twClassName="items-center">
                  <Box twClassName="h-6 w-4 items-center justify-center">
                    {step.status === 'failed' ? (
                      <StepFailureIcon
                        testID={getActivityDetailsStepFailureTestId(index)}
                      />
                    ) : (
                      <StepDot status={DOT_STATUS[step.status]} />
                    )}
                  </Box>
                  {!isLast ? <StepConnector /> : null}
                </Box>
                <Box twClassName="flex-1 pb-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={getStepTextColor(step.status)}
                  >
                    {step.label}
                  </Text>
                  {step.subtext ? (
                    <Text
                      variant={TextVariant.BodyMd}
                      color={getStepSubtextColor(step.status)}
                    >
                      {step.subtext}
                    </Text>
                  ) : null}
                </Box>
                {failureMessage ? (
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                    testID={getActivityDetailsStepIconTestId(index)}
                  />
                ) : explorerLink ? (
                  <Icon
                    name={IconName.Export}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                    testID={getActivityDetailsStepIconTestId(index)}
                  />
                ) : null}
              </Box>
            </Pressable>
          );
        })}
      </Box>
      {failureShown ? (
        <ActivityDetailsStepFailureSheet
          chainId={explorerTarget?.chainId}
          hash={explorerTarget?.hash}
          message={failureShown}
          onClose={dismissFailure}
        />
      ) : null}
    </ActivityDetailSection>
  );
}
