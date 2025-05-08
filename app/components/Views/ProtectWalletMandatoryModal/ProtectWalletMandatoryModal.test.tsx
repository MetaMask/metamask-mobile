import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ProtectWalletMandatoryModal from './ProtectWalletMandatoryModal';
import { backgroundState } from '../../../util/test/initial-root-state';

// Mock the navigation
const mockNavigate = jest.fn();
const mockDangerouslyGetState = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      dangerouslyGetState: mockDangerouslyGetState,
    }),
  };
});

// Mock the metrics hook
jest.mock('../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    WALLET_SECURITY_PROTECT_VIEWED: 'WALLET_SECURITY_PROTECT_VIEWED',
    WALLET_SECURITY_PROTECT_ENGAGED: 'WALLET_SECURITY_PROTECT_ENGAGED',
  },
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn(),
      }),
    }),
  }),
}));

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  hasFunds: jest.fn().mockReturnValue(true),
}));

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
  user: {
    passwordSet: false,
    seedphraseBackedUp: false,
  },
};

describe('ProtectWalletMandatoryModal', () => {
  beforeEach(() => {
    mockDangerouslyGetState.mockReturnValue({
      routes: [{ name: 'Home' }],
    });
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<ProtectWalletMandatoryModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
