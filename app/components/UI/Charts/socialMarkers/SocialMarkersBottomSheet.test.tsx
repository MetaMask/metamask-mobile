import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import SocialMarkersBottomSheet, {
  SOCIAL_MARKERS_SHEET_ROW_TEST_ID,
} from './SocialMarkersBottomSheet';
import type {
  CandleAvatarMarkerEntry,
  CandleAvatarMarkerLookup,
} from './mapFollowingPositionsToCandleAvatarMarkers';
import { playSelection } from '../../../../util/haptics';

jest.mock('../../../../util/haptics', () => ({
  playSelection: jest.fn(async () => undefined),
}));

// Shell mock: closing "animates" synchronously by invoking onClose.
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactActual.forwardRef(
        (
          {
            children,
            onClose,
          }: { children: React.ReactNode; onClose?: () => void },
          ref: React.Ref<{ onCloseBottomSheet: () => void }>,
        ) => {
          ReactActual.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: () => onClose?.(),
          }));
          return <View>{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View>{children}</View>
      ),
    };
  },
);

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

const byId: CandleAvatarMarkerLookup = {
  a: makeEntry('Alice', 'buy', 2),
  b: makeEntry('Bob', 'sell', 1),
};

describe('SocialMarkersBottomSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a Buy and a Sell tag for a mixed cluster', () => {
    render(
      <SocialMarkersBottomSheet
        ids={['a', 'b']}
        byId={byId}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.getByText('Sell')).toBeOnTheScreen();
  });

  it('filters rows to sells and plays a selection haptic', () => {
    render(
      <SocialMarkersBottomSheet
        ids={['a', 'b']}
        byId={byId}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('Sells'));

    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.getByText('Bob')).toBeOnTheScreen();
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('keeps only the All tab when every trade is a buy', () => {
    const allBuys: CandleAvatarMarkerLookup = {
      a: makeEntry('Alice', 'buy', 2),
      c: makeEntry('Carol', 'buy', 1),
    };
    render(
      <SocialMarkersBottomSheet
        ids={['a', 'c']}
        byId={allBuys}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.queryByText('Buys')).toBeNull();
    expect(screen.queryByText('Sells')).toBeNull();
  });

  it('hides filter tabs for a single trade', () => {
    render(
      <SocialMarkersBottomSheet ids={['a']} byId={byId} onClose={jest.fn()} />,
    );

    expect(screen.queryByText('Sells')).toBeNull();
  });

  it('closes the sheet, then hands the tapped trade to onTradePress', () => {
    const calls: string[] = [];
    const onClose = jest.fn(() => calls.push('close'));
    const onTradePress = jest.fn(() => calls.push('trade'));
    render(
      <SocialMarkersBottomSheet
        ids={['a', 'b']}
        byId={byId}
        onClose={onClose}
        onTradePress={onTradePress}
      />,
    );

    fireEvent.press(screen.getAllByTestId(SOCIAL_MARKERS_SHEET_ROW_TEST_ID)[1]);

    expect(calls).toEqual(['close', 'trade']);
    expect(onTradePress).toHaveBeenCalledWith(byId.b);
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('renders non-interactive rows when onTradePress is omitted', () => {
    render(
      <SocialMarkersBottomSheet ids={['a']} byId={byId} onClose={jest.fn()} />,
    );

    const row = screen.getByTestId(SOCIAL_MARKERS_SHEET_ROW_TEST_ID);
    expect(row.props.accessibilityRole).toBeUndefined();
  });
});
