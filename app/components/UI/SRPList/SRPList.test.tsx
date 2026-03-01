import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';

import { SRPListSelectorsIDs } from './SRPList.testIds';
import { SRPListItemSelectorsIDs } from '../SRPListItem/SRPListItem.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';

import SRPList from './SRPList';
import { fireEvent } from '@testing-library/react-native';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../hooks/useMetrics/useMetrics';

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockKeyringMetadata1 = {
  id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
  name: '',
};
const mockKeyringMetadata2 = {
  id: '01JKZ56KRVYEEHC601HSNW28T2',
  name: '',
};

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [
          {
            type: ExtendedKeyringTypes.hd,
            accounts: [internalAccount1.address],
            metadata: mockKeyringMetadata1,
          },
          {
            type: ExtendedKeyringTypes.simple,
            accounts: [internalAccount2.address],
            metadata: mockKeyringMetadata2,
          },
        ],
      },
    },
  },
};

const mockOnKeyringSelect = jest.fn();

const getTestId = (selector: string, keyringId: string) =>
  `${selector}-${keyringId}`;

describe('SRPList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });
  });

  it('renders lists', () => {
    const { getByTestId } = renderWithProvider(
      <SRPList onKeyringSelect={mockOnKeyringSelect} />,
      {
        state: initialState,
      },
    );

    expect(getByTestId(SRPListSelectorsIDs.SRP_LIST)).toBeDefined();
  });

  it('executes onKeyringSelect when a srp is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPList onKeyringSelect={mockOnKeyringSelect} />,
      {
        state: initialState,
      },
    );

    fireEvent.press(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM,
          mockKeyringMetadata1.id,
        ),
      ),
    );

    expect(mockOnKeyringSelect).toHaveBeenCalledWith(mockKeyringMetadata1.id);
  });

  it('tracks SECRET_RECOVERY_PHRASE_PICKER_CLICKED event when a SRP item is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPList onKeyringSelect={mockOnKeyringSelect} />,
      {
        state: initialState,
      },
    );

    fireEvent.press(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM,
          mockKeyringMetadata1.id,
        ),
      ),
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
      )
        .addProperties({
          button_type: 'srp_select',
        })
        .build(),
    );
  });
});
