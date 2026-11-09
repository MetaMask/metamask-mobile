import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictMarketDetailsHeader from './PredictMarketDetailsHeader';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { selectPredictBrandRefreshEnabled } from '../../../../../../../selectors/featureFlagController/predictBrandRefresh';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import type { PredictMarket } from '../../../../types';

jest.mock(
  '../../../../../../../selectors/featureFlagController/predictBrandRefresh',
  () => ({ selectPredictBrandRefreshEnabled: jest.fn() }),
);

jest.mock(
  '../../../../../../../component-library/components-temp/CapsuleGlass',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View testID="capsule">{children}</View>
      ),
    };
  },
);

jest.mock(
  '../../../../components/PredictShareButton/PredictShareButton',
  () => {
    const { Pressable, Text } = jest.requireActual('react-native');
    const { PredictMarketDetailsSelectorsIDs: Selectors } = jest.requireActual(
      '../../../../Predict.testIds',
    );

    return function MockPredictShareButton({
      marketId,
      isCapsule,
    }: {
      marketId?: string;
      isCapsule?: boolean;
    }) {
      return (
        <Pressable
          testID={Selectors.SHARE_BUTTON}
          accessibilityHint={marketId ? `marketId:${marketId}` : undefined}
        >
          <Text>{isCapsule ? 'Share capsule' : 'Share'}</Text>
        </Pressable>
      );
    };
  },
);

const mockSelectPredictBrandRefreshEnabled = jest.mocked(
  selectPredictBrandRefreshEnabled,
);

const createMarket = (overrides: Partial<PredictMarket> = {}): PredictMarket =>
  ({
    id: 'market-1',
    title: 'EPL: 2027 Champion',
    image: 'https://example.com/epl.png',
    slug: 'epl-2027-champion',
    ...overrides,
  }) as PredictMarket;

const renderHeader = (
  overrides: Partial<
    React.ComponentProps<typeof PredictMarketDetailsHeader>
  > = {},
) => {
  const onBackPress = jest.fn();

  renderWithProvider(
    <PredictMarketDetailsHeader
      isLoading={false}
      market={createMarket()}
      title="EPL: 2027 Champion"
      image="https://example.com/epl.png"
      onBackPress={onBackPress}
      {...overrides}
    />,
  );

  return { onBackPress };
};

describe('PredictMarketDetailsHeader', () => {
  beforeEach(() => {
    mockSelectPredictBrandRefreshEnabled.mockReturnValue(false);
  });

  it('renders back button, title, and share for a loaded market with an image', () => {
    renderHeader();

    expect(
      screen.getByTestId(PredictMarketDetailsSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictMarketDetailsSelectorsIDs.SHARE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders header skeleton when the market is loading', () => {
    renderHeader({ isLoading: true });

    expect(
      screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.DETAILS_HEADER_SKELETON_BACK_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictMarketDetailsSelectorsIDs.SHARE_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('calls onBackPress when the back button is pressed', () => {
    const { onBackPress } = renderHeader();

    fireEvent.press(
      screen.getByTestId(PredictMarketDetailsSelectorsIDs.BACK_BUTTON),
    );

    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it('renders the glass header skeleton while loading when the brand refresh is on', () => {
    mockSelectPredictBrandRefreshEnabled.mockReturnValue(true);

    renderHeader({ isLoading: true });

    expect(
      screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.DETAILS_HEADER_SKELETON_BACK_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('capsule')).toBeOnTheScreen();
  });

  it('renders back and share without glass capsules when the brand refresh is off', () => {
    renderHeader();

    expect(screen.queryByTestId('capsule')).toBeNull();
    expect(screen.getByText('Share')).toBeOnTheScreen();
  });

  it('renders back and share in glass capsules when the brand refresh is on', () => {
    mockSelectPredictBrandRefreshEnabled.mockReturnValue(true);

    const { onBackPress } = renderHeader();
    fireEvent.press(
      screen.getByTestId(PredictMarketDetailsSelectorsIDs.BACK_BUTTON),
    );

    expect(screen.getByTestId('capsule')).toBeOnTheScreen();
    expect(screen.getByText('Share capsule')).toBeOnTheScreen();
    expect(onBackPress).toHaveBeenCalledTimes(1);
  });
});
