import React from 'react';
import { render } from '@testing-library/react-native';
import FundActionMenu from './FundActionMenu';

// Mock BottomSheet since it requires complex setup
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const MockedReact = require('react');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { View: MockView } = require('react-native');
    return MockedReact.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: React.Ref<unknown>) =>
        MockedReact.createElement(
          MockView,
          { testID: 'bottom-sheet' },
          children,
        ),
    );
  },
);

// Mock ActionListItem
jest.mock('../../../component-library/components-temp/ActionListItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const MockedReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const {
    TouchableOpacity: MockTouchableOpacity,
    Text: MockText,
  } = require('react-native');
  return ({
    label,
    testID,
    onPress,
  }: {
    label: string;
    testID: string;
    onPress: () => void;
  }) =>
    MockedReact.createElement(
      MockTouchableOpacity,
      { testID, onPress },
      MockedReact.createElement(MockText, null, label),
    );
});

// Mock the navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

// Mock the metrics hook
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  })),
}));

// Mock the ramp hooks
jest.mock('../Ramp/Aggregator/hooks/useRampNetwork', () =>
  jest.fn(() => [true]),
);

jest.mock('../Ramp/Deposit/hooks/useDepositEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isDepositEnabled: true })),
}));

// Mock trace
jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    LoadRampExperience: 'LoadRampExperience',
    LoadDepositExperience: 'LoadDepositExperience',
  },
}));

// Mock selectors
jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(() => '0x1'),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectCanSignTransactions: jest.fn(() => true),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    if (selector.toString().includes('selectChainId')) return '0x1';
    if (selector.toString().includes('selectCanSignTransactions')) return true;
    return null;
  }),
}));

describe('FundActionMenu', () => {
  it('displays the bottom sheet container when rendered', () => {
    // Arrange & Act
    const { getByTestId } = render(<FundActionMenu />);

    // Assert
    expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
  });

  it('mounts without throwing errors', () => {
    // Arrange & Act & Assert
    expect(() => render(<FundActionMenu />)).not.toThrow();
  });
});
