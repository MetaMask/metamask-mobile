import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { MoneyFinishSetupTaskId } from '../../constants/moneyFinishSetupTasks';
import MoneyFinishSetupCard from './MoneyFinishSetupCard';

let mockCompletedCount = 4;
let mockRemainingTask: MoneyFinishSetupTaskId = 'get_card';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    completedCount: mockCompletedCount,
    isTaskComplete: (taskId: MoneyFinishSetupTaskId) =>
      taskId !== mockRemainingTask,
    isVisible: true,
    totalTasks: 5,
  }),
}));

jest.mock('../MoneyFinishSetupProgressRing', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="progress-ring" />;
});

describe('MoneyFinishSetupCard', () => {
  beforeEach(() => {
    mockCompletedCount = 4;
    mockRemainingTask = 'get_card';
  });

  it.each([
    ['pro_benefits', 'Explore MetaMask Orange'],
    ['secure_money', 'Turn on 2-step verification'],
    ['get_card', 'Get MetaMask Card'],
  ] as const)(
    'uses the remaining %s task as the final CTA',
    (remainingTask, expectedLabel) => {
      mockRemainingTask = remainingTask;

      const { getByText } = renderWithProvider(<MoneyFinishSetupCard />);

      expect(getByText(expectedLabel)).toBeOnTheScreen();
    },
  );

  it('uses the general CTA when multiple tasks remain', () => {
    mockCompletedCount = 3;

    const { getByText } = renderWithProvider(<MoneyFinishSetupCard />);

    expect(getByText('Complete setup')).toBeOnTheScreen();
  });

  it('shows one remaining task copy at four of five tasks', () => {
    const { getByText } = renderWithProvider(<MoneyFinishSetupCard />);

    expect(getByText('One more to go')).toBeOnTheScreen();
  });
});
