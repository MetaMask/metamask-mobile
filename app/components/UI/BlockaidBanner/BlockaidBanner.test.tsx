import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import BlockaidBanner from './BlockaidBanner';
import { ATTRIBUTION_LINE_TEST_ID } from './BlockaidBanner.constants';
import { Reason, FlagType } from './BlockaidBanner.types';

describe('BlockaidBanner', () => {
  const mockFeatures = [
    'We found attack vectors in this request',
    'This request shows a fake token name and icon.',
    'If you approve this request, a third party known for scams might take all your assets.',
    'Operator is an EOA',
    'Operator is untrusted according to previous activity',
  ];

  it('should render correctly', () => {
    const wrapper = render(
      <BlockaidBanner
        flagType={FlagType.warning}
        reason={Reason.approvalFarming}
        features={mockFeatures}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with reason "raw_signature_farming"', async () => {
    const wrapper = render(
      <BlockaidBanner
        flagType={FlagType.malicious}
        reason={Reason.rawSignatureFarming}
        features={mockFeatures}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId('accordion-header')).toBeDefined();
    expect(
      await wrapper.getByText('This is a suspicious request'),
    ).toBeDefined();
    expect(
      await wrapper.getByText(
        'If you approve this request, you might lose your assets.',
      ),
    ).toBeDefined();
  });

  it('should render correctly with attribution link', async () => {
    const wrapper = render(
      <BlockaidBanner
        flagType={FlagType.malicious}
        reason={Reason.rawSignatureFarming}
        features={mockFeatures}
      />,
    );

    expect(await wrapper.queryByTestId(ATTRIBUTION_LINE_TEST_ID)).toBeDefined();
  });

  it('should render correctly with list attack details', async () => {
    const wrapper = render(
      <BlockaidBanner
        flagType={FlagType.malicious}
        reason={Reason.approvalFarming}
        features={mockFeatures}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId('accordion-header')).toBeDefined();
    expect(await wrapper.queryByTestId('accordion-content')).toBeNull();

    fireEvent.press(await wrapper.getByText('See details'));

    expect(await wrapper.queryByTestId('accordion-content')).toBeDefined();
    expect(
      await wrapper.queryByText('We found attack vectors in this request'),
    ).toBeDefined();
    expect(
      await wrapper.queryByText(
        'This request shows a fake token name and icon.',
      ),
    ).toBeDefined();
    expect(
      await wrapper.queryByText(
        'If you approve this request, a third party known for scams might take all your assets.',
      ),
    ).toBeDefined();
    expect(await wrapper.queryByText('Operator is an EOA')).toBeDefined();
    expect(
      await wrapper.queryByText(
        'Operator is untrusted according to previous activity',
      ),
    ).toBeDefined();
  });
});
