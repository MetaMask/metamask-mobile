import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import EarnActionHeader from './EarnActionHeader';
import { EARN_ACTION_HEADER_TEST_IDS } from './EarnActionHeader.testIds';

describe('EarnActionHeader', () => {
  it('shows the title and description', () => {
    const { getByTestId } = render(
      <EarnActionHeader title="Earn fees" description="Friends trade" />,
    );

    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.TITLE)).toHaveTextContent(
      'Earn fees',
    );
    expect(
      getByTestId(EARN_ACTION_HEADER_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent('Friends trade');
  });

  it('runs the CTA when it is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <EarnActionHeader
        title="Earn fees"
        description="Friends trade"
        cta={{ label: 'Share code', onPress }}
      />,
    );

    fireEvent.press(getByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the subtext under the CTA', () => {
    const { getByTestId } = render(
      <EarnActionHeader
        title="Earn fees"
        description="Friends trade"
        cta={{ label: 'Share code', onPress: jest.fn() }}
        subtext="Referral code ABC123"
      />,
    );

    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.SUBTEXT)).toHaveTextContent(
      'Referral code ABC123',
    );
  });

  it('leaves out the CTA and the subtext when there is no CTA', () => {
    const { queryByTestId } = render(
      <EarnActionHeader
        title="Earn fees"
        description="Friends trade"
        subtext="Referral code ABC123"
      />,
    );

    expect(queryByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA)).toBeNull();
    expect(queryByTestId(EARN_ACTION_HEADER_TEST_IDS.SUBTEXT)).toBeNull();
  });
});
