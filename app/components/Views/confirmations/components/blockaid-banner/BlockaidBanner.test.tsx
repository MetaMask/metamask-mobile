import React from 'react';

import { fireEvent } from '@testing-library/react-native';

import { TESTID_ACCORDION_CONTENT } from '../../../../../component-library/components/Accordions/Accordion/Accordion.constants';
import { TESTID_ACCORDIONHEADER } from '../../../../../component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader.constants';
import BlockaidBanner from './BlockaidBanner';
import { ResultType, Reason } from './BlockaidBanner.types';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { RootState } from '../../../../../reducers';

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

    expect(wrapper.getByTestId('security-alert-banner')).toBeOnTheScreen();
  });

  it('should render correctly with reason "raw_signature_farming"', () => {
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

    expect(wrapper.getByTestId('security-alert-banner')).toBeOnTheScreen();
    expect(wrapper.getByTestId(TESTID_ACCORDIONHEADER)).toBeOnTheScreen();
    expect(wrapper.getByText('This is a suspicious request')).toBeOnTheScreen();
    expect(
      wrapper.getByText(
        'If you approve this request, you might lose your assets.',
      ),
    ).toBeOnTheScreen();
  });

  it('should render correctly with list attack details', () => {
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

    expect(wrapper.getByTestId('security-alert-banner')).toBeOnTheScreen();
    expect(wrapper.getByTestId(TESTID_ACCORDIONHEADER)).toBeOnTheScreen();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();

    fireEvent.press(wrapper.getByText('See details'));

    expect(wrapper.getByTestId(TESTID_ACCORDION_CONTENT)).toBeOnTheScreen();
    expect(
      wrapper.getByText(/We found attack vectors in this request/),
    ).toBeOnTheScreen();
    expect(
      wrapper.getByText(/This request shows a fake token name and icon\./),
    ).toBeOnTheScreen();
    expect(wrapper.getByText(/Operator is an EOA/)).toBeOnTheScreen();
    expect(
      wrapper.getByText(/Operator is untrusted according to previous activity/),
    ).toBeOnTheScreen();
  });

  it('should render something does not look right with contact us link when expanded', () => {
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

    expect(wrapper.getByTestId('security-alert-banner')).toBeOnTheScreen();
    expect(wrapper.getByTestId(TESTID_ACCORDIONHEADER)).toBeOnTheScreen();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();

    fireEvent.press(wrapper.getByText('See details'));

    expect(wrapper.getByTestId(TESTID_ACCORDION_CONTENT)).toBeOnTheScreen();
    expect(
      wrapper.getByText(/Something doesn\u2019t look right\?/),
    ).toBeOnTheScreen();
  });

  it('should not render if securityAlertResponse is undefined', () => {
    const wrapper = renderWithProvider(<BlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should not render if blockaid does not support network', () => {
    const wrapper = renderWithProvider(<BlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should not render if user has not enabled blockaid', () => {
    const wrapper = renderWithProvider(<BlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should render loader if reason is requestInProgress', () => {
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

    expect(wrapper.getByTestId('blockaid-banner-loader')).toBeOnTheScreen();
    expect(wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(wrapper.queryByTestId('security-alert-banner')).toBeNull();
  });

  it('should not render if resultType is benign', () => {
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

    expect(wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should render normal banner alert if resultType is failed', () => {
    const wrapper = renderWithProvider(
      <BlockaidBanner securityAlertResponse={securityAlertResponse} />,
      { state: mockState },
    );

    expect(wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
    expect(
      wrapper.getByTestId('security-alert-response-failed-banner'),
    ).toBeOnTheScreen();
    expect(wrapper.getByText('Request may not be safe')).toBeOnTheScreen();
    expect(
      wrapper.getByText(
        'Because of an error, this request was not verified by the security provider. Proceed with caution.',
      ),
    ).toBeOnTheScreen();
  });
});
