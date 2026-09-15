import React, { useCallback, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  BottomSheet,
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import {
  MONEY_FINISH_SETUP_TASKS,
  type MoneyFinishSetupTaskId,
} from '../../constants/moneyFinishSetupTasks';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import MoneyFinishSetupProgressRing from '../MoneyFinishSetupProgressRing';
import styleSheet from './MoneyFinishSetupSheet.styles';
import { MoneyFinishSetupSheetTestIds } from './MoneyFinishSetupSheet.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

type TaskLineCounts = Partial<
  Record<MoneyFinishSetupTaskId, { title?: number; description?: number }>
>;

const MoneyFinishSetupSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const {
    completedCount,
    fundPrototypeAccount,
    isTaskComplete,
    markTaskComplete,
    totalTasks,
  } = useMoneyFinishSetup();
  const { isSocialLogin } = useMoneySecurityMethods();
  const [taskLineCounts, setTaskLineCounts] = useState<TaskLineCounts>({});

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_FINISH_SETUP_SHEET,
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: COMPONENT_NAMES.MONEY_FINISH_SETUP_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTaskPress = useCallback(
    (taskId: MoneyFinishSetupTaskId) => {
      if (isTaskComplete(taskId)) {
        return;
      }

      if (taskId === 'add_money') {
        fundPrototypeAccount();
        return;
      }

      if (taskId === 'secure_money') {
        sheetRef.current?.onCloseBottomSheet(() => {
          navigation.navigate(Routes.MONEY.PASSKEYS, {
            entryPoint: 'finish_setup',
          });
        });
        return;
      }

      if (taskId === 'recovery_method') {
        sheetRef.current?.onCloseBottomSheet(() => {
          if (isSocialLogin) {
            navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
              entryPoint: 'finish_setup',
            });
            return;
          }

          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.ADD_SOCIAL_SHEET,
            params: {
              returnToMoneyHome: true,
              showAuthenticatorAlternative: true,
            },
          });
        });
        return;
      }

      markTaskComplete(taskId);
    },
    [
      fundPrototypeAccount,
      isSocialLogin,
      isTaskComplete,
      markTaskComplete,
      navigation,
    ],
  );

  const updateTaskLineCount = useCallback(
    (
      taskId: MoneyFinishSetupTaskId,
      field: 'title' | 'description',
      count: number,
    ) => {
      setTaskLineCounts((current) => {
        if (current[taskId]?.[field] === count) {
          return current;
        }

        return {
          ...current,
          [taskId]: {
            ...current[taskId],
            [field]: count,
          },
        };
      });
    },
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyFinishSetupSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <View style={styles.content}>
        <Box twClassName="items-center pb-4">
          <Box twClassName="py-4">
            <MoneyFinishSetupProgressRing
              completedCount={completedCount}
              totalTasks={totalTasks}
              size="lg"
              testID={`${MoneyFinishSetupSheetTestIds.CONTAINER}-progress`}
            />
          </Box>
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {strings('money.finish_setup.sheet.title')}
          </Text>
        </Box>

        {MONEY_FINISH_SETUP_TASKS.map((task, index) => {
          const complete = isTaskComplete(task.id);
          const lineCounts = taskLineCounts[task.id];
          const isMultiLine =
            (lineCounts?.title ?? 1) + (lineCounts?.description ?? 1) >= 3;

          return (
            <React.Fragment key={task.id}>
              <TouchableOpacity
                style={[
                  styles.taskRow,
                  isMultiLine && styles.taskRowTopAligned,
                ]}
                onPress={() => handleTaskPress(task.id)}
                disabled={complete}
                accessibilityRole="button"
                accessibilityState={{ disabled: complete, checked: complete }}
                testID={`${MoneyFinishSetupSheetTestIds.TASK_ROW_PREFIX}-${task.id}`}
              >
                <Box
                  style={styles.taskIconContainer}
                  twClassName="bg-background-muted"
                >
                  <Icon
                    name={complete ? IconName.Check : task.icon}
                    size={IconSize.Md}
                    color={
                      complete
                        ? IconColor.SuccessDefault
                        : IconColor.IconAlternative
                    }
                  />
                </Box>
                <View style={styles.taskTextContainer}>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={complete ? TextColor.TextMuted : undefined}
                    onTextLayout={(event) =>
                      updateTaskLineCount(
                        task.id,
                        'title',
                        event.nativeEvent.lines.length,
                      )
                    }
                  >
                    {strings(task.titleKey)}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={
                      complete ? TextColor.TextMuted : TextColor.TextAlternative
                    }
                    onTextLayout={(event) =>
                      updateTaskLineCount(
                        task.id,
                        'description',
                        event.nativeEvent.lines.length,
                      )
                    }
                  >
                    {strings(task.descriptionKey)}
                  </Text>
                </View>
                {!complete && (
                  <View style={styles.trailingIcon}>
                    <Icon
                      name={IconName.ArrowRight}
                      size={IconSize.Md}
                      color={IconColor.IconAlternative}
                    />
                  </View>
                )}
              </TouchableOpacity>
              {index < MONEY_FINISH_SETUP_TASKS.length - 1 && (
                <View style={styles.divider} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </BottomSheet>
  );
};

export default MoneyFinishSetupSheet;
