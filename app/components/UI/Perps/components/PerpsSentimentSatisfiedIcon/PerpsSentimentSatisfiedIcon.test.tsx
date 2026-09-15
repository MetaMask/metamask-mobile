import React from 'react';
import { render } from '@testing-library/react-native';
import Svg, { Path } from 'react-native-svg';
import { mockTheme } from '../../../../../util/theme';
import PerpsSentimentSatisfiedIcon, {
  PERPS_SENTIMENT_ICON_SIZE_MD,
  PERPS_SENTIMENT_ICON_SIZE_SM,
} from './PerpsSentimentSatisfiedIcon';

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return { ...actual, useTheme: () => actual.mockTheme };
});

describe('PerpsSentimentSatisfiedIcon', () => {
  it('renders with the default testID', () => {
    const { getByTestId } = render(<PerpsSentimentSatisfiedIcon />);

    expect(getByTestId('perps-sentiment-satisfied-icon')).toBeOnTheScreen();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <PerpsSentimentSatisfiedIcon testID="custom-icon" />,
    );

    expect(getByTestId('custom-icon')).toBeOnTheScreen();
  });

  it('applies custom size and colour to the SVG', () => {
    const color = mockTheme.colors.error.default;

    const { UNSAFE_getByType } = render(
      <PerpsSentimentSatisfiedIcon
        size={PERPS_SENTIMENT_ICON_SIZE_SM}
        color={color}
      />,
    );

    const svg = UNSAFE_getByType(Svg);
    const path = UNSAFE_getByType(Path);

    expect(svg.props.width).toBe(PERPS_SENTIMENT_ICON_SIZE_SM);
    expect(svg.props.height).toBe(PERPS_SENTIMENT_ICON_SIZE_SM);
    expect(path.props.fill).toBe(color);
  });

  it('exposes sizes matching the MMDS Sm and Md icon sizes', () => {
    expect(PERPS_SENTIMENT_ICON_SIZE_SM).toBe(16);
    expect(PERPS_SENTIMENT_ICON_SIZE_MD).toBe(20);
  });
});
