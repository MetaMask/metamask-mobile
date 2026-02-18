import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import DropCommitmentView from './DropCommitmentView';
import { useCommitForDrop } from '../hooks/useCommitForDrop';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
  BoxFlexDirection: { Row: 'Row', Column: 'Column' },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      dropId: 'drop-1',
      dropName: 'Test Drop',
      hasExistingCommitment: false,
      selectedBlockchainAddress: '0x1234',
    },
  }),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({ colors: {} }),
}));

jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/ErrorBoundary', () => {
  const React = require('react');
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement('ErrorBoundary', null, children);
});

jest.mock('../../../../component-library/components/Buttons/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const Button = ({ testID, label, onPress, loading, isDisabled }: any) =>
    React.createElement(
      TouchableOpacity,
      { testID, onPress, disabled: isDisabled || loading },
      React.createElement(Text, null, label),
    );
  Button.displayName = 'Button';
  return {
    __esModule: true,
    default: Button,
    ButtonSize: { Lg: 'Lg' },
    ButtonVariants: { Primary: 'Primary' },
  };
});

jest.mock('../../../Base/Keypad', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ testID }: any) => React.createElement('Keypad', { testID }),
  };
});

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectBalanceTotal: jest.fn(),
}));

jest.mock('../utils/formatUtils', () => ({
  formatNumber: jest.fn((n: number) => n.toString()),
}));

jest.mock('../components/PercentageButtons/PercentageButtons', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ testID }: any) =>
      React.createElement('PercentageButtons', { testID }),
  };
});

jest.mock('../components/RewardPointsAnimation', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('RewardPointsAnimation'),
    RewardAnimationState: { Idle: 'Idle' },
  };
});

jest.mock('../hooks/useCommitForDrop', () => ({
  useCommitForDrop: jest.fn(),
}));

jest.mock('../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: jest.fn(),
    RewardsToastOptions: {
      success: jest.fn(),
      error: jest.fn(),
    },
  }),
}));

describe('DropCommitmentView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(5000);
    (useCommitForDrop as jest.Mock).mockReturnValue({
      commitForDrop: jest.fn(),
      isCommitting: false,
      clearCommitError: jest.fn(),
    });
  });

  it('renders the commitment view with initial state', () => {
    const { getByTestId } = render(<DropCommitmentView />);

    expect(getByTestId('drop-commitment-view')).toBeOnTheScreen();
    expect(getByTestId('commitment-amount-display')).toBeOnTheScreen();
    expect(getByTestId('available-points-label')).toBeOnTheScreen();
  });

  it('renders percentage buttons when amount is 0', () => {
    const { getByTestId } = render(<DropCommitmentView />);

    expect(getByTestId('percentage-buttons')).toBeOnTheScreen();
  });

  it('renders blinking cursor', () => {
    const { getByTestId } = render(<DropCommitmentView />);

    expect(getByTestId('blinking-cursor')).toBeOnTheScreen();
  });

  it('renders keypad component', () => {
    const { getByTestId } = render(<DropCommitmentView />);

    expect(getByTestId('commitment-keypad')).toBeOnTheScreen();
  });

  it('sets navigation options on mount', () => {
    render(<DropCommitmentView />);

    expect(mockSetOptions).toHaveBeenCalled();
  });
});
