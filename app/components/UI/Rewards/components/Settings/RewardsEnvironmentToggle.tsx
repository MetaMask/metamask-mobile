import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
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
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem';
import { cancelBulkLink } from '../../../../../store/sagas/rewardsBulkLinkAccountGroups';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../../reducers/rewards';
import { resetRewardsMoneyState } from '../../../../../reducers/rewardsMoney';

const REWARDS_ENV_OPTIONS: string[] = [
  AppConstants.REWARDS_API_URL.DEV,
  AppConstants.REWARDS_API_URL.UAT,
  AppConstants.REWARDS_API_URL.PRD,
];

if (
  process.env.REWARDS_API_URL &&
  !REWARDS_ENV_OPTIONS.includes(process.env.REWARDS_API_URL)
) {
  REWARDS_ENV_OPTIONS.push(process.env.REWARDS_API_URL);
}

const MONEY_ENV_OPTIONS: string[] = [
  AppConstants.REWARDS_MONEY_API_URL.DEV,
  AppConstants.REWARDS_MONEY_API_URL.UAT,
  AppConstants.REWARDS_MONEY_API_URL.PRD,
];

if (
  process.env.REWARDS_MONEY_API_URL &&
  !MONEY_ENV_OPTIONS.includes(process.env.REWARDS_MONEY_API_URL)
) {
  MONEY_ENV_OPTIONS.push(process.env.REWARDS_MONEY_API_URL);
}

type OpenSheet = 'rewards' | 'money' | null;

interface EnvironmentUrlFieldProps {
  label: string;
  triggerTestID: string;
  optionTestIDPrefix: string;
  closeButtonTestID: string;
  currentEnv: string | null;
  defaultEnv: string | null;
  options: string[];
  isSheetOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (env: string) => void;
  sheetRef: React.RefObject<BottomSheetRef | null>;
}

const EnvironmentUrlField: React.FC<EnvironmentUrlFieldProps> = ({
  label,
  triggerTestID,
  optionTestIDPrefix,
  closeButtonTestID,
  currentEnv,
  defaultEnv,
  options,
  isSheetOpen,
  onOpen,
  onClose,
  onSelect,
  sheetRef,
}) => (
  <Box twClassName="gap-2">
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Button
      testID={triggerTestID}
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      isFullWidth
      onPress={onOpen}
      accessibilityLabel={`${label}: ${currentEnv ?? '...'}`}
    >
      {currentEnv ?? '...'}
    </Button>
    {isSheetOpen ? (
      <BottomSheet shouldNavigateBack={false} ref={sheetRef} onClose={onClose}>
        <HeaderStandard
          title={label}
          onClose={() => sheetRef.current?.onCloseBottomSheet()}
          closeButtonProps={{ testID: closeButtonTestID }}
        />
        {options.map((env) => (
          <ListItemSelect
            key={env}
            testID={`${optionTestIDPrefix}${env}`}
            onPress={() => onSelect(env)}
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
              {env === defaultEnv ? (
                <Box twClassName="px-2 py-0.5 rounded bg-muted">
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('rewards.settings.environment_default')}
                  </Text>
                </Box>
              ) : null}
            </Box>
          </ListItemSelect>
        ))}
      </BottomSheet>
    ) : null}
  </Box>
);

const RewardsEnvironmentToggle: React.FC = () => {
  const [canChangeRewards, setCanChangeRewards] = useState<boolean | null>(
    null,
  );
  const [canChangeMoney, setCanChangeMoney] = useState<boolean | null>(null);
  const [currentRewardsEnv, setCurrentRewardsEnv] = useState<string | null>(
    null,
  );
  const [defaultRewardsEnv, setDefaultRewardsEnv] = useState<string | null>(
    null,
  );
  const [currentMoneyEnv, setCurrentMoneyEnv] = useState<string | null>(null);
  const [defaultMoneyEnv, setDefaultMoneyEnv] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const dispatch = useDispatch();
  const rewardsSheetRef = useRef<BottomSheetRef>(null);
  const moneySheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    const rewardsAllowed =
      Engine.controllerMessenger.call(
        'RewardsController:canChangeRewardsEnvUrl',
      ) === true;
    setCanChangeRewards(rewardsAllowed);
    if (rewardsAllowed) {
      setCurrentRewardsEnv(
        Engine.controllerMessenger.call('RewardsController:getRewardsEnvUrl'),
      );
      setDefaultRewardsEnv(
        Engine.controllerMessenger.call(
          'RewardsController:getDefaultRewardsEnvUrl',
        ),
      );
    }

    const moneyAllowed =
      Engine.controllerMessenger.call(
        'RewardsMoneyController:canChangeRewardsMoneyEnvUrl',
      ) === true;
    setCanChangeMoney(moneyAllowed);
    if (moneyAllowed) {
      setCurrentMoneyEnv(
        Engine.controllerMessenger.call(
          'RewardsMoneyController:getRewardsMoneyEnvUrl',
        ),
      );
      setDefaultMoneyEnv(
        Engine.controllerMessenger.call(
          'RewardsMoneyController:getDefaultRewardsMoneyEnvUrl',
        ),
      );
    }
  }, []);

  const handleRewardsEnvSelect = useCallback(
    async (env: string) => {
      if (env !== currentRewardsEnv) {
        await Engine.controllerMessenger.call(
          'RewardsController:setRewardsEnvUrl',
          env,
        );
        setCurrentRewardsEnv(env);
        dispatch(cancelBulkLink());
        dispatch(resetRewardsState());
        dispatch(setCandidateSubscriptionId('retry'));
      }
      rewardsSheetRef.current?.onCloseBottomSheet();
    },
    [currentRewardsEnv, dispatch],
  );

  const handleMoneyEnvSelect = useCallback(
    async (env: string) => {
      if (env !== currentMoneyEnv) {
        await Engine.controllerMessenger.call(
          'RewardsMoneyController:setRewardsMoneyEnvUrl',
          env,
        );
        setCurrentMoneyEnv(env);
        // Controller caches flush inside setRewardsMoneyEnvUrl; the Redux
        // slice still holds the previous host's referral me and would keep
        // routing as if nothing changed.
        dispatch(resetRewardsMoneyState());
      }
      moneySheetRef.current?.onCloseBottomSheet();
    },
    [currentMoneyEnv, dispatch],
  );

  if (canChangeRewards === null && canChangeMoney === null) {
    return null;
  }

  if (!canChangeRewards && !canChangeMoney) {
    return null;
  }

  return (
    <>
      <Box twClassName="my-4 border-b border-border-muted" />
      <Box
        testID="rewards-environment-toggle"
        twClassName="gap-4 flex-col px-4"
      >
        <Text variant={TextVariant.HeadingMd} twClassName="mt-2">
          {strings('rewards.settings.environment_selector')}
        </Text>
        {canChangeRewards ? (
          <EnvironmentUrlField
            label={strings('bottom_nav.rewards')}
            triggerTestID="rewards-environment-toggle-trigger"
            optionTestIDPrefix="environment-option-"
            closeButtonTestID="environment-sheet-close-button"
            currentEnv={currentRewardsEnv}
            defaultEnv={defaultRewardsEnv}
            options={REWARDS_ENV_OPTIONS}
            isSheetOpen={openSheet === 'rewards'}
            onOpen={() => setOpenSheet('rewards')}
            onClose={() => setOpenSheet(null)}
            onSelect={handleRewardsEnvSelect}
            sheetRef={rewardsSheetRef}
          />
        ) : null}
        {canChangeMoney ? (
          <EnvironmentUrlField
            label={strings('bottom_nav.money')}
            triggerTestID="rewards-money-environment-toggle-trigger"
            optionTestIDPrefix="money-environment-option-"
            closeButtonTestID="money-environment-sheet-close-button"
            currentEnv={currentMoneyEnv}
            defaultEnv={defaultMoneyEnv}
            options={MONEY_ENV_OPTIONS}
            isSheetOpen={openSheet === 'money'}
            onOpen={() => setOpenSheet('money')}
            onClose={() => setOpenSheet(null)}
            onSelect={handleMoneyEnvSelect}
            sheetRef={moneySheetRef}
          />
        ) : null}
      </Box>
    </>
  );
};

export default RewardsEnvironmentToggle;
