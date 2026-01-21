import React from 'react';

import { fireEvent } from '@testing-library/react-native';

import { TESTID_ACCORDION_CONTENT } from '../../../../../component-library/components/Accordions/Accordion/Accordion.constants';
import { TESTID_ACCORDIONHEADER } from '../../../../../component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader.constants';
import { BANNERALERT_TEST_ID } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.constants';
import BlockaidBanner from './BlockaidBanner';
import { FALSE_POSITIVE_REPOST_LINE_TEST_ID } from './BlockaidBanner.constants';
import { ResultType, Reason } from './BlockaidBanner.types';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { RootState } from '../../../../../../reducers';

jest.mock('../../../../../util/blockaid', () => ({
  isBlockaidFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('react-native-gzip', () => ({
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deflate: (val: any) => val,
}));

const mockState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      PreferencesController: { securityAlertsEnabled: true },
    },
  },
};

const mockFeatures = [
  'We found attack vectors in this request',
  'This request shows a fake token name and icon.',
  'If you approve this request, a third party known for scams might take all your assets.',
  'Operator is an EOA',
  'Operator is untrusted according to previous activity',
];

const securityAlertResponse = {
  result_type: ResultType.Failed,
  reason: Reason.failed,
  features: mockFeatures,
  block: 123,
  req: {},
  chainId: '0x1',
};

describe('BlockaidBanner', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner
        securityAlertResponse={{
          ...securityAlertResponse,
          result_type: ResultType.Warning,
          reason: Reason.approvalFarming,
        }}
      />,
      { state: mockState },
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with reason "raw_signature_farming"', async () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner
        securityAlertResponse={{
          ...securityAlertResponse,
          result_type: ResultType.Malicious,
          reason: Reason.rawSignatureFarming,
        }}
      />,
      { state: mockState },
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

  it('should render correctly with list attack details', async () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner
        securityAlertResponse={{
          ...securityAlertResponse,
          result_type: ResultType.Malicious,
          reason: Reason.approvalFarming,
        }}
      />,
      { state: mockState },
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

  it('should render something does not look right with contact us link when expanded', async () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner
        securityAlertResponse={{
          ...securityAlertResponse,
          result_type: ResultType.Malicious,
          reason: Reason.approvalFarming,
        }}
      />,
      { state: mockState },
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeDefined();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();

    fireEvent.press(await wrapper.getByText('See details'));

    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeDefined();
    expect(
      await wrapper.queryByTestId(FALSE_POSITIVE_REPOST_LINE_TEST_ID),
    ).toBeDefined();
    expect(
      await wrapper.queryByText('Something doesn’t look right?'),
    ).toBeDefined();
  });

  it('should not render if securityAlertResponse is undefined', async () => {
    const wrapper = renderWithProvider(<BlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should not render if blockaid does not support network', async () => {
    const wrapper = renderWithProvider(<BlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should not render if user has not enabled blockaid', async () => {
    const wrapper = renderWithProvider(<BlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should render loader if reason is requestInProgress', async () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner
        securityAlertResponse={{
          result_type: ResultType.RequestInProgress,
          reason: Reason.requestInProgress,
        }}
      />,
      {
        state: mockState,
      },
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should not render if resultType is benign', async () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner
        securityAlertResponse={{
          ...securityAlertResponse,
          result_type: ResultType.Benign,
          reason: Reason.rawSignatureFarming,
        }}
      />,
      { state: mockState },
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should render normal banner alert if resultType is failed', async () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner securityAlertResponse={securityAlertResponse} />,
      { state: mockState },
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
