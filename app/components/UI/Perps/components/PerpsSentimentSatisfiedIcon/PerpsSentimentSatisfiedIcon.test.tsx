import React from 'react';
import { render } from '@testing-library/react-native';
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

    expect(getByTestId('perps-sentiment-satisfied-icon')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <PerpsSentimentSatisfiedIcon testID="custom-icon" />,
    );

    expect(getByTestId('custom-icon')).toBeTruthy();
  });

  it('accepts a custom size and colour without erroring', () => {
    const { getByTestId } = render(
      <PerpsSentimentSatisfiedIcon
        size={PERPS_SENTIMENT_ICON_SIZE_SM}
        color={mockTheme.colors.error.default}
      />,
    );

    expect(getByTestId('perps-sentiment-satisfied-icon')).toBeTruthy();
  });

  it('exposes sizes matching the MMDS Sm and Md icon sizes', () => {
    expect(PERPS_SENTIMENT_ICON_SIZE_SM).toBe(16);
    expect(PERPS_SENTIMENT_ICON_SIZE_MD).toBe(20);
  });
});
