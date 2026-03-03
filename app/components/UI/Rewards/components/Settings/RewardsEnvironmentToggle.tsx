import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import AppConstants from '../../../../../core/AppConstants';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem';
import { cancelBulkLink } from '../../../../../store/sagas/rewardsBulkLinkAccountGroups';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../../reducers/rewards';

const ENV_OPTIONS: string[] = [
  AppConstants.REWARDS_API_URL.DEV,
  AppConstants.REWARDS_API_URL.UAT,
  AppConstants.REWARDS_API_URL.PRD,
];

if (
  process.env.REWARDS_API_URL &&
  !ENV_OPTIONS.includes(process.env.REWARDS_API_URL)
) {
  ENV_OPTIONS.push(process.env.REWARDS_API_URL);
}

const RewardsEnvironmentToggle: React.FC = () => {
  const [canChangeEnv, setCanChangeEnv] = useState<boolean | null>(null);
  const [currentEnv, setCurrentEnv] = useState<string | null>(null);
  const [defaultEnv, setDefaultEnv] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    const allowed = Engine.controllerMessenger.call(
      'RewardsController:canChangeRewardsEnvUrl',
    );
    setCanChangeEnv(allowed);
    if (allowed) {
      const env = Engine.controllerMessenger.call(
        'RewardsController:getRewardsEnvUrl',
      );
      setCurrentEnv(env);
      const def = Engine.controllerMessenger.call(
        'RewardsController:getDefaultRewardsEnvUrl',
      );
      setDefaultEnv(def);
    }
  }, []);

  const handleEnvSelect = useCallback(
    async (env: string) => {
      if (env !== currentEnv) {
        await Engine.controllerMessenger.call(
          'RewardsController:setRewardsEnvUrl',
          env,
        );
        setCurrentEnv(env);
        // Mirror the delete-wallet reset flow: cancel any in-flight bulk link
        // saga and wipe the Redux rewards slice so stale data from the previous
        // environment doesn't bleed into the new one.
        dispatch(cancelBulkLink());
        dispatch(resetRewardsState());
        // resetRewardsState() sets candidateSubscriptionId back to 'pending',
        // but useCandidateSubscriptionId only re-fetches on 'retry'. Override
        // to 'retry' so the hook immediately re-fetches for the new env and
        // the onboarding skeleton resolves instead of getting stuck.
        dispatch(setCandidateSubscriptionId('retry'));
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [currentEnv, dispatch],
  );

  // Don't render until the data service has been queried, or if env change is not allowed
  if (canChangeEnv === null || !canChangeEnv) return null;

  return (
    <Box
      testID="rewards-environment-toggle"
      twClassName="gap-4 flex-col py-4 px-4 border-t border-muted"
    >
      <Text variant={TextVariant.HeadingSm}>
        {strings('rewards.settings.environment_selector')}
      </Text>
      <Button
        testID="rewards-environment-toggle-trigger"
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        isFullWidth
        onPress={() => setIsSheetOpen(true)}
        accessibilityLabel={`${strings('rewards.settings.environment_selector')}: ${currentEnv ?? '...'}`}
      >
        {currentEnv ?? '...'}
      </Button>

      {isSheetOpen && (
        <BottomSheet
          shouldNavigateBack={false}
          ref={sheetRef}
          onClose={() => setIsSheetOpen(false)}
        >
          <HeaderCompactStandard
            title={strings('rewards.settings.environment_selector')}
            onClose={() => {
              sheetRef.current?.onCloseBottomSheet();
              setIsSheetOpen(false);
            }}
          />
          {ENV_OPTIONS.map((env) => (
            <ListItemSelect
              key={env}
              onPress={() => handleEnvSelect(env)}
              isSelected={env === currentEnv}
              isDisabled={false}
              gap={8}
              verticalAlignment={VerticalAlignment.Center}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="flex-1"
              >
                <Text variant={TextVariant.BodyMd}>{env}</Text>
                {env === defaultEnv && (
                  <Box twClassName="px-2 py-0.5 rounded bg-muted">
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings('rewards.settings.environment_default')}
                    </Text>
                  </Box>
                )}
              </Box>
            </ListItemSelect>
          ))}
        </BottomSheet>
      )}
    </Box>
  );
};

export default RewardsEnvironmentToggle;
