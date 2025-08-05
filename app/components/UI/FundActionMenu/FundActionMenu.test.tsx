import React from 'react';
import { render } from '@testing-library/react-native';
import FundActionMenu from './FundActionMenu';

// Mock BottomSheet since it requires complex setup
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = require('react');
    return React.forwardRef(({ children }: any, ref: any) => (
      <div testID="bottom-sheet">{children}</div>
    ));
  },
);

// Mock ActionListItem
jest.mock('../../../component-library/components-temp/ActionListItem', () => {
  const React = require('react');
  return ({ label, testID, onPress }: any) => (
    <div testID={testID} onPress={onPress}>
      {label}
    </div>
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
  it('renders correctly', () => {
    const { toJSON } = render(<FundActionMenu />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders BottomSheet container', () => {
    const { getByTestId } = render(<FundActionMenu />);
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('component mounts without errors', () => {
    expect(() => render(<FundActionMenu />)).not.toThrow();
  });
});
