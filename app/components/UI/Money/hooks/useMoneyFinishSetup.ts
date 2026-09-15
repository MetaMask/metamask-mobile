import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectMoneyPasskeyNames,
  selectOnboardingStepperProgress,
} from '../../../../reducers/user/selectors';
import {
  setMoneyPasskeyNames,
  setMoneySmsPhoneNumber,
  setOnboardingStepperStep,
} from '../../../../actions/user';
import { STEPPER_IDS } from './useOnboardingStep';
import {
  getMoneyFinishSetupCompletedCount,
  getMoneyFinishSetupTaskIndex,
  isMoneyFinishSetupTaskIdComplete,
  MONEY_FINISH_SETUP_TOTAL_TASKS,
  type MoneyFinishSetupTaskId,
  withMoneyFinishSetupTaskComplete,
  withoutMoneyFinishSetupTaskComplete,
} from '../constants/moneyFinishSetupTasks';
import {
  getMoneyPasskeyMethodFromCode,
  MONEY_PASSKEY_METHOD_CODES,
  MONEY_PASSKEY_METHOD_NAMES,
  type MoneyPasskeyMethod,
  type MoneyPasskeyRecord,
} from '../constants/moneyPasskey';

const getPasskeyMethodStepperId = (index: number) =>
  index === 0
    ? STEPPER_IDS.MONEY_PASSKEY_METHOD
    : `${STEPPER_IDS.MONEY_PASSKEY_METHOD}-${index + 1}`;

const getPasskeyCreatedAtStepperId = (index: number) =>
  index === 0
    ? STEPPER_IDS.MONEY_PASSKEY_CREATED_AT
    : `${STEPPER_IDS.MONEY_PASSKEY_CREATED_AT}-${index + 1}`;

export const useMoneyFinishSetup = () => {
  const dispatch = useDispatch();
  const progress = useSelector(selectOnboardingStepperProgress);
  const passkeyNames = useSelector(selectMoneyPasskeyNames);
  const completedTasksBitmask = progress[STEPPER_IDS.MONEY_FINISH_SETUP] ?? 0;
  const hasLegacyPasskey = isMoneyFinishSetupTaskIdComplete(
    completedTasksBitmask,
    'secure_money',
  );
  const passkeyCount =
    progress[STEPPER_IDS.MONEY_PASSKEY_COUNT] ?? (hasLegacyPasskey ? 1 : 0);
  const passkeys: MoneyPasskeyRecord[] = Array.from(
    { length: passkeyCount },
    (_, index) => {
      const createdAtTimestamp = progress[getPasskeyCreatedAtStepperId(index)];
      const method = getMoneyPasskeyMethodFromCode(
        progress[getPasskeyMethodStepperId(index)] ?? 0,
      );
      return {
        name:
          passkeyNames[String(index)] ??
          `Passkey #${index + 1} - ${MONEY_PASSKEY_METHOD_NAMES[method]}`,
        method,
        createdAt: createdAtTimestamp
          ? new Date(createdAtTimestamp)
          : undefined,
      };
    },
  );

  const completedCount = getMoneyFinishSetupCompletedCount(
    completedTasksBitmask,
  );
  const isVisible = completedCount < MONEY_FINISH_SETUP_TOTAL_TASKS;
  const isTwoWeeksLater = progress[STEPPER_IDS.MONEY_TWO_WEEKS_LATER] === 1;
  const progressRatio = completedCount / MONEY_FINISH_SETUP_TOTAL_TASKS;

  const setBitmask = useCallback(
    (bitmask: number) => {
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_FINISH_SETUP, bitmask),
      );
    },
    [dispatch],
  );

  const markTaskComplete = useCallback(
    (taskId: MoneyFinishSetupTaskId) => {
      const taskIndex = getMoneyFinishSetupTaskIndex(taskId);
      if (taskIndex < 0) {
        return;
      }

      setBitmask(
        withMoneyFinishSetupTaskComplete(completedTasksBitmask, taskIndex),
      );
    },
    [completedTasksBitmask, setBitmask],
  );

  const toggleTaskComplete = useCallback(
    (taskId: MoneyFinishSetupTaskId) => {
      const taskIndex = getMoneyFinishSetupTaskIndex(taskId);
      if (taskIndex < 0) {
        return;
      }

      const nextBitmask = isMoneyFinishSetupTaskIdComplete(
        completedTasksBitmask,
        taskId,
      )
        ? withoutMoneyFinishSetupTaskComplete(completedTasksBitmask, taskIndex)
        : withMoneyFinishSetupTaskComplete(completedTasksBitmask, taskIndex);

      setBitmask(nextBitmask);
    },
    [completedTasksBitmask, setBitmask],
  );

  const registerPasskey = useCallback(
    (method: MoneyPasskeyMethod) => {
      const taskIndex = getMoneyFinishSetupTaskIndex('secure_money');
      const passkeyIndex = passkeyCount;
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_FINISH_SETUP,
          withMoneyFinishSetupTaskComplete(completedTasksBitmask, taskIndex),
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          getPasskeyMethodStepperId(passkeyIndex),
          MONEY_PASSKEY_METHOD_CODES[method],
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          getPasskeyCreatedAtStepperId(passkeyIndex),
          Date.now(),
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_PASSKEY_COUNT,
          passkeyCount + 1,
        ),
      );
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION, 1),
      );
    },
    [completedTasksBitmask, dispatch, passkeyCount],
  );

  const renamePasskey = useCallback(
    (index: number, name: string) => {
      dispatch(
        setMoneyPasskeyNames({
          ...passkeyNames,
          [String(index)]: name.trim(),
        }),
      );
    },
    [dispatch, passkeyNames],
  );

  const deletePasskey = useCallback(
    (index: number) => {
      if (index < 0 || index >= passkeyCount) {
        return;
      }

      for (
        let currentIndex = index;
        currentIndex < passkeyCount - 1;
        currentIndex++
      ) {
        dispatch(
          setOnboardingStepperStep(
            getPasskeyMethodStepperId(currentIndex),
            progress[getPasskeyMethodStepperId(currentIndex + 1)] ?? 0,
          ),
        );
        dispatch(
          setOnboardingStepperStep(
            getPasskeyCreatedAtStepperId(currentIndex),
            progress[getPasskeyCreatedAtStepperId(currentIndex + 1)] ?? 0,
          ),
        );
      }

      dispatch(
        setOnboardingStepperStep(
          getPasskeyMethodStepperId(passkeyCount - 1),
          0,
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          getPasskeyCreatedAtStepperId(passkeyCount - 1),
          0,
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_PASSKEY_COUNT,
          passkeyCount - 1,
        ),
      );

      const nextNames: Record<string, string> = {};
      for (let nextIndex = 0; nextIndex < passkeyCount - 1; nextIndex++) {
        const previousIndex = nextIndex < index ? nextIndex : nextIndex + 1;
        const name = passkeyNames[String(previousIndex)];
        if (name) {
          nextNames[String(nextIndex)] = name;
        }
      }
      dispatch(setMoneyPasskeyNames(nextNames));

      if (passkeyCount === 1) {
        const taskIndex = getMoneyFinishSetupTaskIndex('secure_money');
        setBitmask(
          withoutMoneyFinishSetupTaskComplete(completedTasksBitmask, taskIndex),
        );
      }
    },
    [
      completedTasksBitmask,
      dispatch,
      passkeyCount,
      passkeyNames,
      progress,
      setBitmask,
    ],
  );

  const isTaskComplete = useCallback(
    (taskId: MoneyFinishSetupTaskId) =>
      isMoneyFinishSetupTaskIdComplete(completedTasksBitmask, taskId),
    [completedTasksBitmask],
  );

  const fundPrototypeAccount = useCallback(() => {
    markTaskComplete('add_money');
    dispatch(
      setOnboardingStepperStep(
        STEPPER_IDS.MONEY_RECOVERY_PROTOTYPE_COMPLETED,
        1,
      ),
    );
  }, [dispatch, markTaskComplete]);

  const advanceTwoWeeks = useCallback(() => {
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_TWO_WEEKS_LATER, 1));
  }, [dispatch]);

  const resetProgress = useCallback(() => {
    setBitmask(0);
    for (let index = 0; index < passkeyCount; index++) {
      dispatch(setOnboardingStepperStep(getPasskeyMethodStepperId(index), 0));
      dispatch(
        setOnboardingStepperStep(getPasskeyCreatedAtStepperId(index), 0),
      );
    }
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_PASSKEY_COUNT, 0));
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR, 0),
    );
    dispatch(
      setOnboardingStepperStep(
        STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR_CREATED_AT,
        0,
      ),
    );
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL, 0));
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_PROVIDER, 0),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_CREATED_AT, 0),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_REMOVED, 1),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED, 1),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT, 0),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION, 0),
    );
    dispatch(
      setOnboardingStepperStep(
        STEPPER_IDS.MONEY_RECOVERY_VERIFICATION_PENDING,
        0,
      ),
    );
    dispatch(
      setOnboardingStepperStep(
        STEPPER_IDS.MONEY_RECOVERY_PROTOTYPE_COMPLETED,
        0,
      ),
    );
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_TWO_WEEKS_LATER, 0));
    dispatch(setMoneyPasskeyNames({}));
    dispatch(setMoneySmsPhoneNumber(''));
  }, [dispatch, passkeyCount, setBitmask]);

  return {
    completedCount,
    completedTasksBitmask,
    advanceTwoWeeks,
    isVisible,
    isTwoWeeksLater,
    isTaskComplete,
    deletePasskey,
    fundPrototypeAccount,
    markTaskComplete,
    passkeyCount,
    passkeys,
    progressRatio,
    renamePasskey,
    registerPasskey,
    resetProgress,
    toggleTaskComplete,
    totalTasks: MONEY_FINISH_SETUP_TOTAL_TASKS,
  };
};
