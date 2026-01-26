import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';

import { SRPListItemSelectorsIDs } from './SRPListItem.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';

import SRPListItem from './SRPListItem';
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

const mockKeyringName1 = 'Secret Recovery Phrase 1';
const mockKeyring1 = {
  type: ExtendedKeyringTypes.hd,
  accounts: [internalAccount1.address],
  metadata: {
    id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
    name: '',
  },
};
const mockKeyring2 = {
  type: ExtendedKeyringTypes.simple,
  accounts: [internalAccount2.address],
  metadata: {
    id: '01JKZ56KRVYEEHC601HSNW28T2',
    name: '',
  },
};

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [mockKeyring1, mockKeyring2],
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

  it('renders', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM,
          mockKeyring1.metadata.id,
        ),
      ),
    ).toBeDefined();
    expect(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
          mockKeyring1.metadata.id,
        ),
      ),
    ).toBeDefined();
  });

  it('calls onActionComplete when the item is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const srpItem = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(srpItem);

    expect(mockOnKeyringSelect).toHaveBeenCalledWith(mockKeyring1.metadata.id);
  });

  it('tracks SECRET_RECOVERY_PHRASE_PICKER_CLICKED event when toggle button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const toggle = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(toggle);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
      )
        .addProperties({
          button_type: 'details',
        })
        .build(),
    );
  });

  it('displays accounts when toggle is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const toggle = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(toggle);

    expect(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM_ACCOUNTS_LIST,
        mockKeyring1.metadata.id,
      ),
    ).toBeDefined();
  });
});
