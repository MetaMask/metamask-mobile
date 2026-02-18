import React from 'react';
import { InteractionManager } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import DropDetailView from './DropDetailView';
import { useSeasonDrops } from '../hooks/useSeasonDrops';
import { useDropEligibility } from '../hooks/useDropEligibility';
import { useDropLeaderboard } from '../hooks/useDropLeaderboard';
import { useUpdateDropReceivingAddress } from '../hooks/useUpdateDropReceivingAddress';
import { DropStatus } from '../../../../core/Engine/controllers/rewards-controller/types';
import Engine from '../../../../core/Engine';
import { setIsValidatingDropAddress } from '../../../../reducers/rewards';
import {
  mapReceivingBlockchainIdToEnum,
  findMatchingBlockchainAccount,
} from '../utils/blockchainUtils';

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
  const ActualReact = jest.requireActual('react');
  return ({ children }: { children: React.ReactNode }) =>
    ActualReact.createElement('ErrorBoundary', null, children);
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
let capturedOnChangeAccount: (() => void) | undefined;
jest.mock('../components/DropLeaderboard', () => {
  const ActualReact = jest.requireActual('react');
  return (props: { onChangeAccount?: () => void }) => {
    capturedOnChangeAccount = props.onChangeAccount;
    return ActualReact.createElement('DropLeaderboard', props);
  };
});

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ActualReact = jest.requireActual('react');
    const BottomSheet = ActualReact.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{ onCloseBottomSheet: (cb: () => void) => void }>,
      ) => {
        ActualReact.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb: () => void) => cb(),
        }));
        return ActualReact.createElement('BottomSheet', null, children);
      },
    );
    BottomSheet.displayName = 'BottomSheet';
    return { __esModule: true, default: BottomSheet };
  },
);
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => 'BottomSheetHeader',
);

let capturedOnSelectAccount: ((ag: unknown) => void) | undefined;
jest.mock(
  '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList',
  () => {
    const ActualReact = jest.requireActual('react');
    return (props: { onSelectAccount?: (ag: unknown) => void }) => {
      capturedOnSelectAccount = props.onSelectAccount;
      return ActualReact.createElement('MultichainAccountSelectorList', props);
    };
  },
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

const mockShowToast = jest.fn();
const mockRewardsToastOptions = {
  success: jest.fn((...args: unknown[]) => ({ type: 'success', args })),
  error: jest.fn((...args: unknown[]) => ({ type: 'error', args })),
};
jest.mock('../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: mockRewardsToastOptions,
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

  describe('handleSelectAccountGroup', () => {
    const mockUpdateDropReceivingAddress = jest.fn();
    const mockAccountGroup = {
      id: 'group-1',
      metadata: { name: 'My Wallet' },
    };

    const setupWithCommitmentSection = () => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockImplementation((cb) => {
          if (typeof cb === 'function') cb();
          return { done: Promise.resolve(), cancel: jest.fn() };
        });

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
      (useUpdateDropReceivingAddress as jest.Mock).mockReturnValue({
        updateDropReceivingAddress: mockUpdateDropReceivingAddress,
      });
    };

    const setupCommitFlow = () => {
      setupWithCommitmentSection();
      (useDropLeaderboard as jest.Mock).mockReturnValue({
        leaderboard: null,
        isLoading: false,
        error: null,
      });
    };

    const setupChangeFlow = () => {
      setupWithCommitmentSection();
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
    };

    beforeEach(() => {
      capturedOnSelectAccount = undefined;
      capturedOnChangeAccount = undefined;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows error toast when validateAccountGroupForDrop throws', async () => {
      setupCommitFlow();

      (mapReceivingBlockchainIdToEnum as jest.Mock).mockReturnValue('evm');
      (findMatchingBlockchainAccount as jest.Mock).mockReturnValue({
        address: '0xabc',
      });
      (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const { getByTestId } = render(<DropDetailView />);

      // Open account picker via the commit-flow selector
      fireEvent.press(getByTestId('drop-account-selector'));

      // Select an account — triggers handleSelectAccountGroup in 'commit' mode
      expect(capturedOnSelectAccount).toBeDefined();
      if (capturedOnSelectAccount) {
        capturedOnSelectAccount(mockAccountGroup);
      }

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          mockRewardsToastOptions.error(
            'rewards.drops.cant_select_account_title',
            'rewards.drops.cant_select_account_description',
          ),
        );
      });

      // Skeleton must still be cleared even after error
      expect(mockDispatch).toHaveBeenCalledWith(
        setIsValidatingDropAddress(false),
      );
    });

    it('clears loading skeleton only after doChangeAccountUpdate resolves', async () => {
      setupChangeFlow();

      let resolveUpdate: (val: boolean) => void = () => undefined;
      mockUpdateDropReceivingAddress.mockReturnValue(
        new Promise<boolean>((res) => {
          resolveUpdate = res;
        }),
      );

      (mapReceivingBlockchainIdToEnum as jest.Mock).mockReturnValue('evm');
      (findMatchingBlockchainAccount as jest.Mock).mockReturnValue({
        address: '0xabc',
      });
      (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(null);

      render(<DropDetailView />);

      // Open the picker in 'change' mode via the leaderboard callback.
      // This triggers setShowAccountPicker(true) which requires a re-render
      // to mount the BottomSheet and capture onSelectAccount.
      expect(capturedOnChangeAccount).toBeDefined();
      await act(async () => {
        if (capturedOnChangeAccount) {
          capturedOnChangeAccount();
        }
      });

      // Select an account — triggers handleSelectAccountGroup in 'change' mode
      expect(capturedOnSelectAccount).toBeDefined();
      if (capturedOnSelectAccount) {
        capturedOnSelectAccount(mockAccountGroup);
      }

      // The update is still pending — skeleton should NOT be cleared yet
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          setIsValidatingDropAddress(true),
        );
      });

      // Resolve the update
      resolveUpdate(true);

      // Now finally should run and clear the skeleton
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          setIsValidatingDropAddress(false),
        );
      });
    });

    it('dispatches skeleton lifecycle correctly in commit flow', async () => {
      setupCommitFlow();

      (mapReceivingBlockchainIdToEnum as jest.Mock).mockReturnValue('evm');
      (findMatchingBlockchainAccount as jest.Mock).mockReturnValue({
        address: '0xabc',
      });
      (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = render(<DropDetailView />);

      fireEvent.press(getByTestId('drop-account-selector'));

      expect(capturedOnSelectAccount).toBeDefined();
      if (capturedOnSelectAccount) {
        capturedOnSelectAccount(mockAccountGroup);
      }

      await waitFor(() => {
        const calls = mockDispatch.mock.calls.map((c: [unknown]) => c[0]);
        expect(calls).toContainEqual(setIsValidatingDropAddress(true));
        expect(calls).toContainEqual(setIsValidatingDropAddress(false));
      });
    });
  });
});
