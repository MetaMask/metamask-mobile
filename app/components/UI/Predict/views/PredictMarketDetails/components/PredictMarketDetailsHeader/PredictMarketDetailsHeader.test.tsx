import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictMarketDetailsHeader from './PredictMarketDetailsHeader';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import type { PredictMarket } from '../../../../types';

jest.mock(
  '../../../../components/PredictShareButton/PredictShareButton',
  () => {
    const { Pressable, Text } = jest.requireActual('react-native');
    const { PredictMarketDetailsSelectorsIDs: Selectors } = jest.requireActual(
      '../../../../Predict.testIds',
    );

    return function MockPredictShareButton({
      marketId,
    }: {
      marketId?: string;
    }) {
      return (
        <Pressable
          testID={Selectors.SHARE_BUTTON}
          accessibilityHint={marketId ? `marketId:${marketId}` : undefined}
        >
          <Text>Share</Text>
        </Pressable>
      );
    };
  },
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
});
