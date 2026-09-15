import { IconName } from '@metamask/design-system-react-native';

export const MONEY_FINISH_SETUP_TOTAL_TASKS = 5;

export const MONEY_FINISH_SETUP_TASK_IDS = [
  'add_money',
  'secure_money',
  'recovery_method',
  'pro_benefits',
  'get_card',
] as const;

export type MoneyFinishSetupTaskId =
  (typeof MONEY_FINISH_SETUP_TASK_IDS)[number];

export interface MoneyFinishSetupTaskDefinition {
  id: MoneyFinishSetupTaskId;
  titleKey: string;
  descriptionKey: string;
  icon: IconName;
}

export const MONEY_FINISH_SETUP_TASKS: MoneyFinishSetupTaskDefinition[] = [
  {
    id: 'add_money',
    titleKey: 'money.finish_setup.tasks.add_money.title',
    descriptionKey: 'money.finish_setup.tasks.add_money.description',
    icon: IconName.Add,
  },
  {
    id: 'secure_money',
    titleKey: 'money.finish_setup.tasks.secure_money.title',
    descriptionKey: 'money.finish_setup.tasks.secure_money.description',
    icon: IconName.SecurityTick,
  },
  {
    id: 'recovery_method',
    titleKey: 'money.finish_setup.tasks.recovery_method.title',
    descriptionKey: 'money.finish_setup.tasks.recovery_method.description',
    icon: IconName.Key,
  },
  {
    id: 'pro_benefits',
    titleKey: 'money.finish_setup.tasks.pro_benefits.title',
    descriptionKey: 'money.finish_setup.tasks.pro_benefits.description',
    icon: IconName.Star,
  },
  {
    id: 'get_card',
    titleKey: 'money.finish_setup.tasks.get_card.title',
    descriptionKey: 'money.finish_setup.tasks.get_card.description',
    icon: IconName.Card,
  },
];

export const getMoneyFinishSetupTaskIndex = (
  taskId: MoneyFinishSetupTaskId,
): number => MONEY_FINISH_SETUP_TASK_IDS.indexOf(taskId);

export const isMoneyFinishSetupTaskComplete = (
  bitmask: number,
  taskIndex: number,
): boolean => (bitmask & (1 << taskIndex)) !== 0;

export const getMoneyFinishSetupCompletedCount = (bitmask: number): number =>
  MONEY_FINISH_SETUP_TASK_IDS.reduce(
    (count, _, index) =>
      count + (isMoneyFinishSetupTaskComplete(bitmask, index) ? 1 : 0),
    0,
  );

export const isMoneyFinishSetupTaskIdComplete = (
  bitmask: number,
  taskId: MoneyFinishSetupTaskId,
): boolean => {
  const taskIndex = getMoneyFinishSetupTaskIndex(taskId);
  return taskIndex >= 0 && isMoneyFinishSetupTaskComplete(bitmask, taskIndex);
};

export const withMoneyFinishSetupTaskComplete = (
  bitmask: number,
  taskIndex: number,
): number => bitmask | (1 << taskIndex);

export const withoutMoneyFinishSetupTaskComplete = (
  bitmask: number,
  taskIndex: number,
): number => bitmask & ~(1 << taskIndex);
