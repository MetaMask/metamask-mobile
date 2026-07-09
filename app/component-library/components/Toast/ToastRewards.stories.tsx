import React, { useCallback, useContext, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import useRewardsToast, {
  type RewardsToastConfig,
  type RewardsToastOptions,
} from '../../../components/UI/Rewards/hooks/useRewardsToast';
import { strings } from '../../../../locales/i18n';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { StoryContainer, StoryToastHost } from './ToastStory.shared';

const MOCK_CAMPAIGN_NAME = 'Summer Swap';

const showStoryAlert = (message: string) => {
  Alert.alert('Storybook', message);
};

interface RewardsToastTrigger {
  label: string;
  getConfig: (options: RewardsToastConfig) => RewardsToastOptions;
}

interface RewardsToastTriggerSection {
  title: string;
  triggers: RewardsToastTrigger[];
}

const buildRewardsToastSections = (
  options: RewardsToastConfig,
): RewardsToastTriggerSection[] => [
  {
    title: 'Base',
    triggers: [
      {
        label: 'Success',
        getConfig: () =>
          options.success(strings('rewards.notifications_nudge.success')),
      },
      {
        label: 'Success with description',
        getConfig: () =>
          options.success(
            strings('rewards.campaign.remind_me_success_toast'),
            'You can manage reminders from campaign settings.',
          ),
      },
      {
        label: 'Error',
        getConfig: () =>
          options.error(strings('rewards.optout.modal.error_message')),
      },
      {
        label: 'Error with description',
        getConfig: () =>
          options.error(
            strings('rewards.optin_error.title'),
            strings('rewards.optin_error.description'),
          ),
      },
      {
        label: 'Loading',
        getConfig: () =>
          options.loading(
            strings('rewards.notifications_nudge.loading'),
            strings('rewards.notifications_nudge.loading_description'),
          ),
      },
      {
        label: 'Warning',
        getConfig: () =>
          options.warning(
            strings('rewards.optout.request_received.title'),
            strings('rewards.optout.request_received.description'),
          ),
      },
    ],
  },
  {
    title: 'Campaign',
    triggers: [
      {
        label: 'Entries closed',
        getConfig: () =>
          options.entriesClosed(
            strings('rewards.campaign_details.ondo.entries_closed_title'),
          ),
      },
      {
        label: 'Entries closed with description',
        getConfig: () =>
          options.entriesClosed(
            strings('rewards.campaign_details.ondo.entries_closed_title'),
            strings('rewards.campaign_details.ondo.entries_closed_description'),
          ),
      },
    ],
  },
  {
    title: 'Notifications',
    triggers: [
      {
        label: 'Enable notifications nudge',
        getConfig: () =>
          options.enableNotificationsNudge({
            label: strings('rewards.notifications_nudge.turn_on_button'),
            onPress: () => showStoryAlert('Turn on notifications pressed'),
          }),
      },
    ],
  },
  {
    title: 'Campaign outcome',
    triggers: [
      {
        label: 'Outcome winner',
        getConfig: () =>
          options.outcomeWinner({
            title: strings('rewards.campaign_outcome_toast.winner.title'),
            description: strings(
              'rewards.campaign_outcome_toast.winner.description',
              { campaignName: MOCK_CAMPAIGN_NAME },
            ),
            ctaLabel: strings('rewards.campaign_outcome_toast.winner.cta'),
            onCtaPress: () => showStoryAlert('View details pressed'),
            onClosePress: () => showStoryAlert('Outcome toast dismissed'),
          }),
      },
      {
        label: 'Outcome non-winner',
        getConfig: () =>
          options.outcomeNonWinner({
            title: strings('rewards.campaign_outcome_toast.non_winner.title'),
            description: strings(
              'rewards.campaign_outcome_toast.non_winner.description',
              { campaignName: MOCK_CAMPAIGN_NAME },
            ),
            ctaLabel: strings('rewards.campaign_outcome_toast.non_winner.cta'),
            onCtaPress: () => showStoryAlert('View details pressed'),
            onClosePress: () => showStoryAlert('Outcome toast dismissed'),
          }),
      },
    ],
  },
];

const RewardsToastsStoryContent = () => {
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const sections = useMemo(
    () => buildRewardsToastSections(RewardsToastOptions),
    [RewardsToastOptions],
  );

  const triggerRewardsToast = useCallback(
    (trigger: RewardsToastTrigger) => {
      showToast({
        ...trigger.getConfig(RewardsToastOptions),
        hasNoTimeout: true,
      });
    },
    [RewardsToastOptions, showToast],
  );

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => (
          <View key={section.title} style={tw.style('gap-2')}>
            <Text variant={TextVariant.HeadingSm}>{section.title}</Text>
            {section.triggers.map((trigger) => (
              <Button
                key={trigger.label}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => triggerRewardsToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const RewardsToastsStory = () => (
  <ToastContextWrapper>
    <RewardsToastsStoryContent />
  </ToastContextWrapper>
);

const RewardsToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default RewardsToastsMeta;

export const RewardsToasts = {
  render: () => <RewardsToastsStory />,
};
