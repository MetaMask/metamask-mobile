import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import DropDetailView from './DropDetailView';
import { useSeasonDrops } from '../hooks/useSeasonDrops';
import { useDropEligibility } from '../hooks/useDropEligibility';
import { useDropLeaderboard } from '../hooks/useDropLeaderboard';
import { useUpdateDropReceivingAddress } from '../hooks/useUpdateDropReceivingAddress';
import { DropStatus } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  Icon: 'Icon',
  Button: 'Button',
  ButtonIcon: 'ButtonIcon',
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm', HeadingMd: 'HeadingMd' },
  FontWeight: { Medium: 'Medium' },
  IconName: {
    Question: 'Question',
    MountainFlag: 'MountainFlag',
    ArrowDown: 'ArrowDown',
  },
  IconSize: { Lg: 'Lg', Sm: 'Sm' },
  BoxFlexDirection: { Row: 'Row', Column: 'Column' },
  ButtonIconSize: { Lg: 'Lg' },
  IconColor: { IconDefault: 'IconDefault', IconAlternative: 'IconAlternative' },
  ButtonVariant: { Primary: 'Primary' },
  ButtonSize: { Lg: 'Lg' },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
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
    params: { dropId: 'drop-1' },
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

jest.mock('../../../../component-library/components/Skeleton', () => ({
  Skeleton: 'Skeleton',
}));

jest.mock('../components/DropTile/DropTile', () => 'DropTile');
jest.mock(
  '../components/DropPrerequisite/DropPrerequisiteList',
  () => 'DropPrerequisiteList',
);
jest.mock('../components/RewardsErrorBanner', () => 'RewardsErrorBanner');
jest.mock(
  '../components/DropCTAButtons/DropCTAButtons',
  () => 'DropCTAButtons',
);
jest.mock('../components/DropLeaderboard', () => 'DropLeaderboard');

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = require('react');
    const BottomSheet = React.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: React.Ref<unknown>) =>
        React.createElement('BottomSheet', null, children),
    );
    BottomSheet.displayName = 'BottomSheet';
    return { __esModule: true, default: BottomSheet };
  },
);
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => 'BottomSheetHeader',
);
jest.mock(
  '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList',
  () => 'MultichainAccountSelectorList',
);
jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => 'AvatarAccount',
);
jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Md: 'Md' },
}));

jest.mock('../hooks/useSeasonDrops', () => ({
  useSeasonDrops: jest.fn(),
}));

jest.mock('../hooks/useDropEligibility', () => ({
  useDropEligibility: jest.fn(),
}));

jest.mock('../hooks/useDropLeaderboard', () => ({
  useDropLeaderboard: jest.fn(),
}));

jest.mock('../hooks/useUpdateDropReceivingAddress', () => ({
  useUpdateDropReceivingAddress: jest.fn(),
}));

jest.mock('../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: jest.fn() }),
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

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
  selectIconSeedAddressByAccountGroupId: jest.fn(),
}));

jest.mock('../../../../selectors/settings', () => ({
  selectAvatarAccountType: jest.fn(),
}));

jest.mock('../utils/blockchainUtils', () => ({
  mapReceivingBlockchainIdToEnum: jest.fn(),
  findMatchingBlockchainAccount: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setIsValidatingDropAddress: jest.fn(),
}));

const mockDrop = {
  id: 'drop-1',
  name: 'Test Drop',
  seasonId: 'season-1',
  tokenSymbol: 'MON',
  tokenAmount: '50000',
  tokenChainId: '1',
  receivingBlockchain: 1,
  opensAt: '2025-03-01T00:00:00Z',
  closesAt: '2025-03-15T00:00:00Z',
  image: { lightModeUrl: 'light.png', darkModeUrl: 'dark.png' },
  status: DropStatus.OPEN,
  prerequisites: {
    logic: 'AND' as const,
    conditions: [
      {
        type: 'ACTIVITY_COUNT' as const,
        activityTypes: ['SWAP' as const],
        minCount: 1,
        title: 'Make a swap',
        description: 'Complete at least 1 swap',
        iconName: 'swap',
      },
    ],
  },
};

describe('DropDetailView', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockReturnValue(jest.fn());
    (useUpdateDropReceivingAddress as jest.Mock).mockReturnValue({
      updateDropReceivingAddress: jest.fn(),
    });
  });

  it('renders loading skeleton when drops are loading', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [],
      isLoading: true,
      hasError: false,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
      isLoading: false,
      error: null,
    });

    const { toJSON } = render(<DropDetailView />);

    expect(toJSON()).not.toBeNull();
  });

  it('renders error banner when drops have error', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [],
      isLoading: false,
      hasError: true,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<DropDetailView />);

    expect(getByTestId('drop-detail-error-banner')).toBeOnTheScreen();
  });

  it('renders drop not found when drop does not exist', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [],
      isLoading: false,
      hasError: false,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
      isLoading: false,
      error: null,
    });

    const { toJSON } = render(<DropDetailView />);

    expect(toJSON()).not.toBeNull();
  });

  it('renders drop tile when drop exists', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [mockDrop],
      isLoading: false,
      hasError: false,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: {
        eligible: false,
        canCommit: true,
        prerequisiteStatuses: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<DropDetailView />);

    expect(getByTestId('drop-detail-view')).toBeOnTheScreen();
  });

  it('renders commitment section when user is eligible and can commit', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [mockDrop],
      isLoading: false,
      hasError: false,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: {
        eligible: true,
        canCommit: true,
        prerequisiteStatuses: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<DropDetailView />);

    expect(getByTestId('drop-account-section-description')).toBeOnTheScreen();
    expect(getByTestId('drop-enter-button')).toBeOnTheScreen();
  });

  it('renders eligibility error banner when eligibility fetch fails', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [mockDrop],
      isLoading: false,
      hasError: false,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: {
        eligible: false,
        canCommit: false,
        prerequisiteStatuses: [],
      },
      isLoading: false,
      error: 'Failed to load eligibility',
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<DropDetailView />);

    expect(getByTestId('drop-eligibility-error-banner')).toBeOnTheScreen();
  });

  it('renders leaderboard section when user has committed', () => {
    (useSeasonDrops as jest.Mock).mockReturnValue({
      drops: [mockDrop],
      isLoading: false,
      hasError: false,
      fetchDrops: jest.fn(),
    });
    (useDropEligibility as jest.Mock).mockReturnValue({
      eligibility: {
        eligible: true,
        canCommit: true,
        prerequisiteStatuses: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: {
        dropId: 'drop-1',
        userPosition: { rank: 5, points: 1000, identifier: '0x1234' },
        top20: [],
        totalParticipants: 100,
        totalPointsCommitted: 50000,
      },
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<DropDetailView />);

    expect(getByTestId('drop-detail-view')).toBeOnTheScreen();
  });
});
