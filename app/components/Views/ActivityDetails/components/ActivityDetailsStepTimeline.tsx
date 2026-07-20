import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  useActivityBlockExplorer,
  type ActivityExplorerLink,
} from '../hooks/useActivityBlockExplorer';
import { ActivityDetailSection } from './ActivityDetailsLayout';

export type ActivityDetailsStepStatus =
  | 'completed'
  | 'pending'
  | 'failed'
  | 'upcoming';

export interface ActivityDetailsStep {
  label: string;
  subtext?: string;
  status: ActivityDetailsStepStatus;
}

export interface ActivityDetailsStepExplorerTarget {
  chainId: string;
  hash: string;
}

function StepConnector() {
  return (
    <Box twClassName="items-center -mt-0.5 gap-0.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <Box key={index} twClassName="w-1 h-1 rounded-full bg-border-muted" />
      ))}
    </Box>
  );
}

function getStepDotClassName(status: ActivityDetailsStepStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-success-default';
    case 'failed':
      return 'bg-error-default';
    case 'pending':
      return 'bg-warning-default';
    case 'upcoming':
    default:
      return 'bg-muted';
  }
}

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
  const navigation = useNavigation();

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

          return (
            <Pressable
              key={`${step.label}-${index}`}
              disabled={!explorerLink}
              onPress={openExplorer}
              testID={`activity-details-step-${index}`}
            >
              <Box twClassName="flex-row items-start gap-3">
                <Box twClassName="items-center">
                  <Box twClassName="h-6 items-center justify-center">
                    <Box
                      twClassName={`w-2 h-2 rounded-full ${getStepDotClassName(
                        step.status,
                      )}`}
                    />
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
                {explorerLink ? (
                  <Icon
                    name={IconName.Export}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                    testID={`activity-details-step-${index}-icon`}
                  />
                ) : null}
              </Box>
            </Pressable>
          );
        })}
      </Box>
    </ActivityDetailSection>
  );
}
