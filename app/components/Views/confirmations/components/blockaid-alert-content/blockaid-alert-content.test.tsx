import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import BlockaidAlertContent from './blockaid-alert-content';
import { BlockaidAlertContentTestIds } from './blockaid-alert-content.testIds';
// TODO: Remove legacy import
import {
  SecurityAlertResponse,
  Reason,
} from '../../components/blockaid-banner/BlockaidBanner.types';
import { deflate } from 'react-native-gzip';
import type { Hex } from '@metamask/utils';
import { ResultType as BlockaidResultType } from '../../constants/signatures';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { RootState } from '../../../../../reducers';

jest.mock('react-native-gzip', () => ({
  deflate: jest.fn().mockResolvedValue('compressedData'),
}));

const networkStateWith = (
  chainId: Hex,
  name: string,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          [chainId]: { chainId, name },
        },
      },
    },
  },
});

const MAINNET_CHAIN_ID: Hex = '0x1';
const MAINNET_STATE = networkStateWith(MAINNET_CHAIN_ID, 'Ethereum');

describe('BlockaidAlertContent', () => {
  const DETAILS_ACCORDION_TITLE = 'See details';
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
    chainId: MAINNET_CHAIN_ID,
  };

  const mockOnContactUsClicked = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with given props', () => {
    const { getByText } = renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    expect(getByText(DETAILS_ACCORDION_TITLE)).toBeDefined();
    expect(
      getByText('If you approve this request, you might lose your assets.'),
    ).toBeDefined();
  });

  it('toggles accordion details on press', () => {
    const { getByText, queryByText } = renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
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
    renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    await waitFor(() => {
      expect(deflate).toHaveBeenCalledWith(
        JSON.stringify({
          domain: REQUEST_MOCK.origin,
          jsonRpcMethod: REQUEST_MOCK.method,
          jsonRpcParams: '["param1","param2"]',
          blockNumber: BLOCK_NUMBER_MOCK,
          chain: 'Ethereum',
          classification: Reason.other,
          resultType: BlockaidResultType.Malicious,
          reproduce: '["Detail 1","Detail 2"]',
        }),
      );
    });
  });

  it('calls onContactUsClicked when report link is clicked', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponse}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    const accordionTitle = getByText(DETAILS_ACCORDION_TITLE);
    await act(async () => {
      fireEvent.press(accordionTitle);
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(BlockaidAlertContentTestIds.REPORT_ISSUE_BUTTON),
      );
    });

    expect(mockOnContactUsClicked).toHaveBeenCalled();
  });

  it('does not generate report URL if req or chainId is missing', async () => {
    const mockSecurityAlertResponseWithoutReq: SecurityAlertResponse = {
      ...mockSecurityAlertResponse,
      req: null,
    } as unknown as SecurityAlertResponse;

    renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponseWithoutReq}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    await waitFor(() => {
      expect(deflate).not.toHaveBeenCalled();
    });

    const mockSecurityAlertResponseWithoutChainId: SecurityAlertResponse = {
      ...mockSecurityAlertResponse,
      chainId: null,
    } as unknown as SecurityAlertResponse;

    renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponseWithoutChainId}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    await waitFor(() => {
      expect(deflate).not.toHaveBeenCalled();
    });
  });

  it('reports the network name for a chain absent from the legacy Blockaid network map', async () => {
    const ROBINHOOD_CHAIN_ID: Hex = '0x1237';

    renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={{
          ...mockSecurityAlertResponse,
          chainId: ROBINHOOD_CHAIN_ID,
        }}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      {
        state: networkStateWith(ROBINHOOD_CHAIN_ID, 'Robinhood Chain'),
      },
    );

    await waitFor(() => {
      expect(deflate).toHaveBeenCalledWith(
        expect.stringContaining('"chain":"Robinhood Chain"'),
      );
    });
  });

  it('omits the chain when the network is not configured', async () => {
    renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={{
          ...mockSecurityAlertResponse,
          chainId: '0xdead',
        }}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    await waitFor(() => {
      expect(deflate).toHaveBeenCalledWith(
        expect.not.stringContaining('"chain"'),
      );
    });
  });

  it('renders generic reason message if reason not recognised', () => {
    const mockSecurityAlertResponseWithUnknownReason: SecurityAlertResponse = {
      ...mockSecurityAlertResponse,
      reason: 'unknown_reason' as Reason,
    };

    const { getByText } = renderWithProvider(
      <BlockaidAlertContent
        alertDetails={ALERT_DETAILS_MOCK}
        securityAlertResponse={mockSecurityAlertResponseWithUnknownReason}
        onContactUsClicked={mockOnContactUsClicked}
      />,
      { state: MAINNET_STATE },
    );

    expect(
      getByText(strings('blockaid_banner.other_description')),
    ).toBeDefined();
  });
});
