import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TESTID_ACCORDION_CONTENT } from '../../../../../component-library/components/Accordions/Accordion/Accordion.constants';
import { TESTID_ACCORDIONHEADER } from '../../../../../component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader.constants';

import { ResultType, Reason } from '../BlockaidBanner/BlockaidBanner.types';
import TransactionBlockaidBanner from './TransactionBlockaidBanner';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      state: {
        securityAlertsEnabled: true,
      },
    },
  },
}));

jest.mock('react-native-gzip', () => ({
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deflate: (val: any) => val,
}));

const mockState = {
  engine: {
    backgroundState: {
      NetworkController: { providerConfig: { chainId: '0x1' } },
      PreferencesController: { securityAlertsEnabled: true },
    },
  },
  transaction: {
    currentTransactionSecurityAlertResponse: {
      id: '123',
      response: {
        result_type: ResultType.Warning,
        reason: Reason.approvalFarming,
        block: 123,
        req: {},
        chainId: '0x1',
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
              block: 123,
              req: {},
              chainId: '0x1',
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
