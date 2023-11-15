import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { TESTID_ACCORDION_CONTENT } from '../../../component-library/components/Accordions/Accordion/Accordion.constants';
import { TESTID_ACCORDIONHEADER } from '../../../component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader.constants';

import { ResultType, Reason } from '../BlockaidBanner/BlockaidBanner.types';
import TransactionBlockaidBanner from './TransactionBlockaidBanner';

jest.mock('../../../util/blockaid', () => ({
  isBlockaidFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const mockState = {
  engine: {
    backgroundState: {
      NetworkController: { providerConfig: { chainId: '1' } },
      PreferencesController: { securityAlertsEnabled: true },
    },
  },
  transaction: {
    currentTransactionSecurityAlertResponse: {
      id: '123',
      response: {
        result_type: ResultType.Warning,
        reason: Reason.approvalFarming,
      },
    },
  },
};

describe('TransactionBlockaidBanner', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <TransactionBlockaidBanner transactionId="123" />,
      {
        state: mockState,
      },
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should not render if transactionId passed is undefined', async () => {
    const wrapper = renderWithProvider(<TransactionBlockaidBanner />, {
      state: mockState,
    });

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });

  it('should not render if currentTransactionSecurityAlertResponse.id is undefined', async () => {
    const wrapper = renderWithProvider(<TransactionBlockaidBanner />, {
      state: {
        ...mockState,
        transaction: {
          currentTransactionSecurityAlertResponse: {
            response: {
              result_type: ResultType.Warning,
              reason: Reason.approvalFarming,
            },
          },
        },
      },
    });

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });
});
