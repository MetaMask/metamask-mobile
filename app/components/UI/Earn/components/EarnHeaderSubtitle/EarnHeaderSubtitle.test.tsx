import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import EarnHeaderSubtitle from './EarnHeaderSubtitle';
import { EARN_HEADER_SUBTITLE_TEST_IDS } from './EarnHeaderSubtitle.testIds';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { EarnTokenDetails } from '../../types/lending.types';

const buildEarnToken = (
  overrides: Partial<EarnTokenDetails> = {},
): EarnTokenDetails =>
  ({
    balanceFormatted: '12.345 stETH',
    experience: {
      type: EARN_EXPERIENCES.POOLED_STAKING,
      apr: '3.456',
    },
    ...overrides,
  }) as unknown as EarnTokenDetails;

describe('EarnHeaderSubtitle', () => {
  it('renders nothing when earnToken is null', () => {
    const { queryByTestId } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={null} />,
    );

    expect(queryByTestId(EARN_HEADER_SUBTITLE_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('renders nothing when earnToken is undefined', () => {
    const { queryByTestId } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={undefined} />,
    );

    expect(queryByTestId(EARN_HEADER_SUBTITLE_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('renders the formatted balance and APR derived from the token experience', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={buildEarnToken()} />,
    );

    expect(
      getByTestId(EARN_HEADER_SUBTITLE_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('12.345 stETH')).toBeOnTheScreen();
    // 3.456 → 3.5% (one decimal), suffixed with the localized "APR" string.
    expect(getByText('3.5% APR')).toBeOnTheScreen();
  });

  it('falls back to 0.0% when token experience APR is missing', () => {
    const earnToken = buildEarnToken({
      experience: undefined,
    } as unknown as Partial<EarnTokenDetails>);

    const { getByText } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={earnToken} />,
    );

    expect(getByText('0.0% APR')).toBeOnTheScreen();
  });

  it('uses aprOverride when it parses to a positive number', () => {
    const { getByText, queryByText } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={buildEarnToken()} aprOverride="7.89%" />,
    );

    expect(getByText('7.89% APR')).toBeOnTheScreen();
    // Should not also render the underlying token APR.
    expect(queryByText('3.5% APR')).toBeNull();
  });

  it('ignores aprOverride when it does not parse to a positive number', () => {
    const { getByText } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={buildEarnToken()} aprOverride="0" />,
    );

    expect(getByText('3.5% APR')).toBeOnTheScreen();
  });

  it('ignores aprOverride when it is null', () => {
    const { getByText } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={buildEarnToken()} aprOverride={null} />,
    );

    expect(getByText('3.5% APR')).toBeOnTheScreen();
  });

  it('honors a custom container testID', () => {
    const customTestID = 'custom-earn-subtitle';
    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnHeaderSubtitle earnToken={buildEarnToken()} testID={customTestID} />,
    );

    expect(getByTestId(customTestID)).toBeOnTheScreen();
    expect(queryByTestId(EARN_HEADER_SUBTITLE_TEST_IDS.CONTAINER)).toBeNull();
  });
});
