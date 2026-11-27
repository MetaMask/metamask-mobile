import React from 'react';
import { render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import HomepagePredictDiscoveryRowIcon from './HomepagePredictDiscoveryRowIcon';

jest.mock('./HomepagePredictDiscoveryMaterialGlyph', () => {
  const { View } = jest.requireActual('react-native');
  return ({ name }: { name: string }) => (
    <View testID={`homepage-predict-discovery-material-glyph-${name}`} />
  );
});

describe('HomepagePredictDiscoveryRowIcon', () => {
  it('renders the configured design-system icon instead of the default glyph', () => {
    const { getByTestId, queryByTestId } = render(
      <HomepagePredictDiscoveryRowIcon
        iconName={IconName.Basketball}
        fallbackGlyph="emojiEvents"
      />,
    );

    expect(
      getByTestId('homepage-predict-discovery-row-icon-Basketball', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      queryByTestId('homepage-predict-discovery-material-glyph-emojiEvents', {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });

  it('hides the configured icon from assistive tech', () => {
    const { queryByTestId } = render(
      <HomepagePredictDiscoveryRowIcon
        iconName={IconName.Basketball}
        fallbackGlyph="emojiEvents"
      />,
    );

    expect(
      queryByTestId('homepage-predict-discovery-row-icon-Basketball'),
    ).not.toBeOnTheScreen();
  });

  it('renders the default glyph when no icon is configured', () => {
    const { getByTestId } = render(
      <HomepagePredictDiscoveryRowIcon fallbackGlyph="currencyBitcoin" />,
    );

    expect(
      getByTestId('homepage-predict-discovery-material-glyph-currencyBitcoin'),
    ).toBeOnTheScreen();
  });
});
