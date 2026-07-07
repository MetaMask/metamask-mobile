import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import PredictWorldCupBannerCard from './PredictWorldCupBannerCard';

const testIDs = {
  container: 'banner-card',
  image: 'banner-card-image',
  arrow: 'banner-card-arrow',
};

const baseProps = {
  imageSource: 1 as never,
  title: 'Title',
  description: 'Description',
  testIDs,
};

describe('PredictWorldCupBannerCard', () => {
  it('renders the title and description', () => {
    const { getByText } = render(
      <PredictWorldCupBannerCard {...baseProps} onPress={jest.fn()} />,
    );

    expect(getByText('Title')).toBeOnTheScreen();
    expect(getByText('Description')).toBeOnTheScreen();
  });

  it('uses a fixed 80x80 image for the compact variant', () => {
    const { getByTestId } = render(
      <PredictWorldCupBannerCard
        {...baseProps}
        variant="compact"
        onPress={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(getByTestId(testIDs.image).props.style),
    ).toMatchObject({ height: 80, width: 80 });
  });

  it('uses the provided image height for the default variant', () => {
    const { getByTestId } = render(
      <PredictWorldCupBannerCard
        {...baseProps}
        variant="default"
        imageHeight={123}
        onPress={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(getByTestId(testIDs.image).props.style).height,
    ).toBe(123);
  });

  it('hides the decorative arrow from the accessibility tree', () => {
    const { queryByTestId } = render(
      <PredictWorldCupBannerCard {...baseProps} onPress={jest.fn()} />,
    );

    expect(queryByTestId(testIDs.arrow)).toBeNull();
  });

  it('calls onPress when the card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PredictWorldCupBannerCard {...baseProps} onPress={onPress} />,
    );

    fireEvent.press(getByTestId(testIDs.container));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
