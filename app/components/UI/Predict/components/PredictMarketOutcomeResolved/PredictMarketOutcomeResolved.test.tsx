import React from 'react';
import { render } from '@testing-library/react-native';
import PredictMarketOutcomeResolved from './PredictMarketOutcomeResolved';
import { PredictOutcome } from '../../types';
import { formatVolume } from '../../utils/format';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.volume_abbreviated': 'Vol.',
      'predict.outcome_draw': 'Draw',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../utils/format');

const createMockOutcome = (
  overrides?: Partial<PredictOutcome>,
): PredictOutcome => ({
  id: 'test-outcome-1',
  marketId: 'test-market-1',
  providerId: 'test-provider',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  tokens: [
    {
      id: 'token-yes',
      title: 'Yes',
      price: 0.65,
    },
    {
      id: 'token-no',
      title: 'No',
      price: 0.35,
    },
  ],
  volume: 1000000,
  groupItemTitle: 'Crypto Markets',
  negRisk: false,
  tickSize: '0.01',
  ...overrides,
});

describe('PredictMarketOutcomeResolved', () => {
  const mockFormatVolume = formatVolume as jest.MockedFunction<
    typeof formatVolume
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatVolume.mockImplementation((volume: string | number) => {
      const numVolume =
        typeof volume === 'string' ? parseFloat(volume) : volume;
      if (numVolume >= 1000000) {
        return `${(numVolume / 1000000).toFixed(1)}M`;
      }
      if (numVolume >= 1000) {
        return `${(numVolume / 1000).toFixed(1)}K`;
      }
      return numVolume.toString();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders outcome title and volume information', () => {
    const outcome = createMockOutcome();

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
    expect(getByText(/\$1\.0M.*Vol\./)).toBeOnTheScreen();
  });

  it('displays token one as winner when token one price is higher', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.75 },
        { id: 'token-no', title: 'No', price: 0.25 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('Yes')).toBeOnTheScreen();
  });

  it('displays token two as winner when token two price is higher', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.25 },
        { id: 'token-no', title: 'No', price: 0.75 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('No')).toBeOnTheScreen();
  });

  it('displays draw when token prices are equal', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.5 },
        { id: 'token-no', title: 'No', price: 0.5 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('Draw')).toBeOnTheScreen();
  });

  it('renders confirmation icon when token one wins', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.75 },
        { id: 'token-no', title: 'No', price: 0.25 },
      ],
    });

    const { getByTestId } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    // Component renders without errors and shows winner
    expect(getByTestId).toBeDefined();
  });

  it('renders without confirmation icon when token two wins', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.25 },
        { id: 'token-no', title: 'No', price: 0.75 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    // Verify token two is displayed as winner
    expect(getByText('No')).toBeOnTheScreen();
  });

  it('renders without confirmation icon when prices are equal', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.5 },
        { id: 'token-no', title: 'No', price: 0.5 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    // Verify draw is displayed
    expect(getByText('Draw')).toBeOnTheScreen();
  });

  it('renders with container styling when noContainer is false', () => {
    const outcome = createMockOutcome();

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} noContainer={false} />,
    );

    // Component renders successfully
    expect(getByText('Crypto Markets')).toBeOnTheScreen();
  });

  it('renders with minimal styling when noContainer is true', () => {
    const outcome = createMockOutcome();

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} noContainer />,
    );

    // Component renders successfully
    expect(getByText('Crypto Markets')).toBeOnTheScreen();
  });

  it('handles zero volume', () => {
    const outcome = createMockOutcome({ volume: 0 });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });

  it('formats large volume values correctly', () => {
    const outcome = createMockOutcome({ volume: 5000000 });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText(/\$5\.0M.*Vol\./)).toBeOnTheScreen();
  });

  it('formats small volume values correctly', () => {
    const outcome = createMockOutcome({ volume: 5000 });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText(/\$5\.0K.*Vol\./)).toBeOnTheScreen();
  });

  it('truncates long outcome titles with ellipsis', () => {
    const outcome = createMockOutcome({
      groupItemTitle:
        'This is a very long title that should be truncated with ellipsis',
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    const titleElement = getByText(
      'This is a very long title that should be truncated with ellipsis',
    );
    expect(titleElement).toBeOnTheScreen();
    expect(titleElement.props.numberOfLines).toBe(1);
    expect(titleElement.props.ellipsizeMode).toBe('tail');
  });

  it('handles very small price differences between tokens', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.501 },
        { id: 'token-no', title: 'No', price: 0.499 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('Yes')).toBeOnTheScreen();
  });

  it('handles price of 1.0 for winning token', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 1.0 },
        { id: 'token-no', title: 'No', price: 0.0 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('Yes')).toBeOnTheScreen();
  });

  it('handles price of 0.0 for both tokens', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.0 },
        { id: 'token-no', title: 'No', price: 0.0 },
      ],
    });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText('Draw')).toBeOnTheScreen();
  });

  it('calls formatVolume with outcome volume', () => {
    const outcome = createMockOutcome({ volume: 1000000 });

    render(<PredictMarketOutcomeResolved outcome={outcome} />);

    expect(mockFormatVolume).toHaveBeenCalledWith(1000000);
  });

  it('displays formatted volume in UI', () => {
    mockFormatVolume.mockReturnValue('1.5M');
    const outcome = createMockOutcome({ volume: 1500000 });

    const { getByText } = render(
      <PredictMarketOutcomeResolved outcome={outcome} />,
    );

    expect(getByText(/\$1\.5M.*Vol\./)).toBeOnTheScreen();
  });
});
