import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import SocialMarkersBottomSheet, {
  SocialMarkersBottomSheetTestIds,
} from './SocialMarkersBottomSheet';
import type { CandleAvatarMarkerEntry } from './mapFollowingPositionsToCandleAvatarMarkers';
import type { SocialMarkersBottomSheetParams } from './SocialMarkersBottomSheet.types';
import Routes from '../../../../constants/navigation/Routes';
import { playSelection } from '../../../../util/haptics';
import { SocialEvent } from '../../../Views/SocialLeaderboard/analytics/socialEvents';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParams: SocialMarkersBottomSheetParams;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams,
}));

jest.mock('../../../../util/haptics', () => ({
  playSelection: jest.fn(async () => undefined),
}));

// Renders children and closes synchronously (no animation), calling goBack
// like the real sheet does once its close animation ends.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          goBack,
        }: { children: React.ReactNode; testID?: string; goBack?: () => void },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => goBack?.(),
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

jest.mock('../../SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View /> };
});

const makeEntry = (
  name: string,
  direction: 'buy' | 'sell',
  timestamp: number,
): CandleAvatarMarkerEntry =>
  ({
    actor: {
      profileId: `id-${name}`,
      address: `0x${name}`,
      name,
      imageUrl: null,
    },
    trade: {
      direction,
      intent: 'enter',
      tokenAmount: 2,
      usdCost: 200,
      timestamp,
      transactionHash: `0x${name}${timestamp}`,
    } as Trade,
    position: { positionId: `pos-${name}`, tokenSymbol: 'ETH' },
  }) as unknown as CandleAvatarMarkerEntry;

const alice = makeEntry('Alice', 'buy', 2);
const bob = makeEntry('Bob', 'sell', 1);

describe('SocialMarkersBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { entries: [bob, alice] };
  });

  it('lists trades newest first with Buy and Sell tags', () => {
    render(<SocialMarkersBottomSheet />);

    const rows = screen.getAllByTestId(SocialMarkersBottomSheetTestIds.ROW);
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Trader activity')).toBeOnTheScreen();
    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.getByText('Sell')).toBeOnTheScreen();
    expect(
      screen.getAllByText(/Alice|Bob/).map((n) => n.props.children),
    ).toEqual(['Alice', 'Bob']);
  });

  it('filters rows to sells and plays a selection haptic', () => {
    render(<SocialMarkersBottomSheet />);

    fireEvent.press(screen.getByText('Sells'));

    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.getByText('Bob')).toBeOnTheScreen();
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('keeps only the All filter when every trade is a buy', () => {
    mockParams = { entries: [alice, makeEntry('Carol', 'buy', 1)] };
    render(<SocialMarkersBottomSheet />);

    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.queryByText('Buys')).toBeNull();
    expect(screen.queryByText('Sells')).toBeNull();
  });

  it('hides filters for a single trade', () => {
    mockParams = { entries: [alice] };
    render(<SocialMarkersBottomSheet />);

    expect(screen.queryByText('All')).toBeNull();
  });

  it('pushes the position sheet with a back button on row press', () => {
    render(<SocialMarkersBottomSheet />);

    fireEvent.press(
      screen.getAllByTestId(SocialMarkersBottomSheetTestIds.ROW)[1],
    );

    expect(playSelection).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION_SHEET,
      expect.objectContaining({
        positionId: 'pos-Bob',
        position: bob.position,
        author: expect.objectContaining({ id: 'id-Bob', username: 'Bob' }),
        isClosed: false,
        isSnapshotLive: false,
        analyticsSource: SocialEvent.Source.TOKEN_DETAILS_CHART,
        showBackButton: true,
      }),
    );
  });

  it('closes the sheet from the header close button', () => {
    render(<SocialMarkersBottomSheet />);

    fireEvent.press(
      screen.getByTestId(SocialMarkersBottomSheetTestIds.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
