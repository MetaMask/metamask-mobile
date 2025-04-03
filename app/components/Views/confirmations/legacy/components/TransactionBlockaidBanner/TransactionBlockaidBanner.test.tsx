import React from 'react';

import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { TESTID_ACCORDION_CONTENT } from '../../../../../../component-library/components/Accordions/Accordion/Accordion.constants';
import { TESTID_ACCORDIONHEADER } from '../../../../../../component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader.constants';

import { ResultType, Reason } from '../BlockaidBanner/BlockaidBanner.types';
import TransactionBlockaidBanner from './TransactionBlockaidBanner';
import { RootState } from '../../../../../../reducers';

jest.mock('../../../../../../core/Engine', () => ({
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

const mockState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      PreferencesController: { securityAlertsEnabled: true },
    },
  },
  transaction: {
    id: 123,
    securityAlertResponses: {
      123: {
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

  it('should not render if securityAlertResponses.id is undefined', async () => {
    const wrapper = renderWithProvider(
      <TransactionBlockaidBanner transactionId="123" />,
      {
        state: {
          ...mockState,
          transaction: {
            securityAlertResponses: {},
          },
        },
      },
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId(TESTID_ACCORDIONHEADER)).toBeNull();
    expect(await wrapper.queryByTestId(TESTID_ACCORDION_CONTENT)).toBeNull();
  });
});
