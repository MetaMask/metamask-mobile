import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import {
    TESTID_ACCORDION_CONTENT
} from '../../../component-library/components/Accordions/Accordion/Accordion.constants';
import {
    TESTID_ACCORDIONHEADER
} from '../../../component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader.constants';
import {
    BANNERALERT_TEST_ID
} from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import BlockaidBanner from './BlockaidBanner';
import { ATTRIBUTION_LINE_TEST_ID } from './BlockaidBanner.constants';
import { ResultType, Reason } from './BlockaidBanner.types';

jest.mock('../../../util/blockaid', () => ({
  showBlockaidUI: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../util/blockaid', () => ({
  showBlockaidUI: jest.fn().mockReturnValue(true),
}));

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
        securityAlertResponse={{
          resultType: ResultType.Warning,
          reason: Reason.approvalFarming,
          features: mockFeatures,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with reason "raw_signature_farming"', async () => {
    const wrapper = render(
      <BlockaidBanner
        securityAlertResponse={{
          resultType: ResultType.Malicious,
          reason: Reason.rawSignatureFarming,
          features: mockFeatures,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeDefined();
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
        securityAlertResponse={{
          resultType: ResultType.Malicious,
          reason: Reason.rawSignatureFarming,
          features: mockFeatures,
        }}
      />,
    );

    expect(await wrapper.queryByTestId(ATTRIBUTION_LINE_TEST_ID)).toBeDefined();
  });

  it('should render correctly with list attack details', async () => {
    const wrapper = render(
      <BlockaidBanner
        securityAlertResponse={{
          resultType: ResultType.Malicious,
          reason: Reason.approvalFarming,
          features: mockFeatures,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeDefined();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();

    fireEvent.press(await wrapper.getByText('See details'));

    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeDefined();
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

  it('should not render if securityAlertResponse is undefined', async () => {
    const wrapper = render(<BlockaidBanner />);

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should not render if resultType is benign', async () => {
    const wrapper = render(
      <BlockaidBanner
        securityAlertResponse={{
          resultType: ResultType.Benign,
          reason: Reason.rawSignatureFarming,
          features: mockFeatures,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should render normal banner alert if resultType is failed', async () => {
    const wrapper = render(
      <BlockaidBanner
        securityAlertResponse={{
          resultType: ResultType.Failed,
          reason: Reason.rawSignatureFarming,
          features: mockFeatures,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();

    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
    expect(await wrapper.queryByTestId(BANNERALERT_TEST_ID)).toBeDefined();
    expect(await wrapper.queryByText('Request may not be safe')).toBeDefined();
    expect(
      await wrapper.queryByText(
        'Because of an error, this request was not verified by the security provider. Proceed with caution.',
      ),
    ).toBeDefined();
  });
});