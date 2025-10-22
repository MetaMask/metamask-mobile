import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BlockaidAlertContent from './blockaid-alert-content';
// TODO: Remove legacy import
import {
  SecurityAlertResponse,
  Reason,
} from '../../legacy/components/BlockaidBanner/BlockaidBanner.types';
import { deflate } from 'react-native-gzip';
import { BLOCKAID_SUPPORTED_NETWORK_NAMES } from '../../../../../util/networks';
import { ResultType as BlockaidResultType } from '../../constants/signatures';
import { strings } from '../../../../../../locales/i18n';

jest.mock('react-native-gzip', () => ({
  deflate: jest.fn().mockResolvedValue('compressedData'),
}));

describe('BlockaidAlertContent', () => {
  const DETAILS_ACCORDION_TITLE = 'See details';
  const REPORT_LINK_TEXT = 'Report an issue';
  const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
  const BLOCK_NUMBER_MOCK = 12345;
  const REQUEST_MOCK = {
    origin: 'https://example.com',
    method: 'eth_sign',
    params: ['param1', 'param2'],
  };
  const mockSecurityAlertResponse: SecurityAlertResponse = {
    result_type: BlockaidResultType.Malicious,
    reason: Reason.other,
    features: ALERT_DETAILS_MOCK,
    block: BLOCK_NUMBER_MOCK,
    req: REQUEST_MOCK,
    chainId: '1',
  };

  const mockOnContactUsClicked = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with given props', () => {
    const { getByText } = render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    expect(getByText(DETAILS_ACCORDION_TITLE)).toBeDefined();
    expect(
      getByText('If you approve this request, you might lose your assets.'),
    ).toBeDefined();
  });

  it('toggles accordion details on press', () => {
    const { getByText, queryByText } = render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    const accordionTitle = getByText(DETAILS_ACCORDION_TITLE);
    act(() => {
      fireEvent.press(accordionTitle);
    });

    expect(queryByText('• Detail 1')).toBeDefined();
    expect(queryByText('• Detail 2')).toBeDefined();
    act(() => {
      fireEvent.press(accordionTitle);
    });
    expect(queryByText('• Detail 1')).toBeNull();
    expect(queryByText('• Detail 2')).toBeNull();
  });

  it('generates the correct report URL', async () => {
    render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    await waitFor(() => {
      expect(deflate).toHaveBeenCalledWith(
        JSON.stringify({
          domain: REQUEST_MOCK.origin,
          jsonRpcMethod: REQUEST_MOCK.method,
          jsonRpcParams: '["param1","param2"]',
          blockNumber: BLOCK_NUMBER_MOCK,
          chain: BLOCKAID_SUPPORTED_NETWORK_NAMES['1'],
          classification: Reason.other,
          resultType: BlockaidResultType.Malicious,
          reproduce: '["Detail 1","Detail 2"]',
        }),
      );
    });
  });

  it('calls onContactUsClicked when report link is clicked', async () => {
    const { getByText } = render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    const accordionTitle = getByText(DETAILS_ACCORDION_TITLE);
    await act(async () => {
      fireEvent.press(accordionTitle);
    });

    const reportLink = getByText(REPORT_LINK_TEXT);
    await act(async () => {
      fireEvent.press(reportLink);
    });

    expect(mockOnContactUsClicked).toHaveBeenCalled();
  });

  it('does not generate report URL if req or chainId is missing', async () => {
    const mockSecurityAlertResponseWithoutReq: SecurityAlertResponse = {
      ...mockSecurityAlertResponse,
      req: null,
    } as unknown as SecurityAlertResponse;

    render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponseWithoutReq}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    await waitFor(() => {
      expect(deflate).not.toHaveBeenCalled();
    });

    const mockSecurityAlertResponseWithoutChainId: SecurityAlertResponse = {
      ...mockSecurityAlertResponse,
      chainId: null,
    } as unknown as SecurityAlertResponse;

    render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponseWithoutChainId}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    await waitFor(() => {
      expect(deflate).not.toHaveBeenCalled();
    });
  });

  it('renders generic reason message if reason not recognised', () => {
    const mockSecurityAlertResponseWithUnknownReason: SecurityAlertResponse = {
      ...mockSecurityAlertResponse,
      reason: 'unknown_reason' as Reason,
    };

    const { getByText } = render(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponseWithUnknownReason}
        onContactUsClicked={mockOnContactUsClicked}
      />,
    );

    expect(
      getByText(strings('blockaid_banner.other_description')),
    ).toBeDefined();
  });
});
