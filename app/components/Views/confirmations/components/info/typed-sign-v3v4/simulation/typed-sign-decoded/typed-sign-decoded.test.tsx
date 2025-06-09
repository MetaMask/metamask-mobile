import React from 'react';
import { waitFor } from '@testing-library/react-native';
import cloneDeep from 'lodash/cloneDeep';
import {
  DecodingDataChangeType,
  DecodingDataStateChanges,
  SignatureRequest,
} from '@metamask/signature-controller';

import { strings } from '../../../../../../../../../locales/i18n';
import { typedSignV4ConfirmationState } from '../../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import TypedSignDecoded, {
  getStateChangeToolip,
  getStateChangeType,
  StateChangeType,
} from './typed-sign-decoded';

const stateChangesApprove = [
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Approve,
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    amount: '12345',
    contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
  },
];

const stateChangesRevoke = [
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Revoke,
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    amount: '12345',
    contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
];

const stateChangesListingERC1155: DecodingDataStateChanges = [
  {
    assetType: 'NATIVE',
    changeType: DecodingDataChangeType.Receive,
    address: '',
    amount: '900000000000000000',
    contractAddress: '',
  },
  {
    assetType: 'ERC1155',
    changeType: DecodingDataChangeType.Listing,
    address: '',
    amount: '',
    contractAddress: '0xafd4896984CA60d2feF66136e57f958dCe9482d5',
    tokenID: '77789',
  },
];

const stateChangesNftListing: DecodingDataStateChanges = [
  {
    assetType: 'ERC721',
    changeType: DecodingDataChangeType.Listing,
    address: '',
    amount: '',
    contractAddress: '0x922dC160f2ab743312A6bB19DD5152C1D3Ecca33',
    tokenID: '22222',
  },
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Receive,
    address: '',
    amount: '950000000000000000',
    contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
];

const stateChangesNftBidding: DecodingDataStateChanges = [
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Bidding,
    address: '',
    amount: '',
    contractAddress: '0x922dC160f2ab743312A6bB19DD5152C1D3Ecca33',
    tokenID: '189',
  },
  {
    assetType: 'ERC721',
    changeType: DecodingDataChangeType.Receive,
    address: '',
    amount: '950000000000000000',
    contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
];

const stateChangesApproveDAI: DecodingDataStateChanges = [
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Approve,
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    amount: '1461501637330902918203684832716283019655932542975',
    contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
];

const stateChangesRevokeDAI: DecodingDataStateChanges = [
  {
    assetType: 'ERC20',
    changeType: DecodingDataChangeType.Revoke,
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    amount: '0',
    contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
];

const mockState = (
  mockStateChanges: DecodingDataStateChanges,
  stubDecodingLoading: boolean = false,
) => {
  const clonedMockState = cloneDeep(typedSignV4ConfirmationState);
  const request = clonedMockState.engine.backgroundState.SignatureController
    .signatureRequests[
    'fb2029e1-b0ab-11ef-9227-05a11087c334'
  ] as SignatureRequest;
  request.decodingLoading = stubDecodingLoading;
  request.decodingData = {
    stateChanges: mockStateChanges,
  };

  return clonedMockState;
};

describe('DecodedSimulation', () => {
  it('renders for ERC20 approval', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TypedSignDecoded />,
      {
        state: mockState(stateChangesApprove),
      },
    );

    expect(await getByText('Estimated changes')).toBeDefined();
    expect(await getByText('Spending cap')).toBeDefined();

    // Loading renders before the token value renders
    expect(getByTestId('simulation-value-display-loader')).toBeDefined();

    await waitFor(() => expect(getByText('12,345')).toBeDefined());
  });

  it('renders for ERC20 revoke', () => {
    const { queryByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState(stateChangesRevoke),
    });

    expect(queryByText('Estimated changes')).toBeDefined();
    expect(queryByText('Revoke')).toBeDefined();

    expect(queryByText('Unlimited')).toBeNull();
  });

  it('renders "Unlimited" for large values', async () => {
    const { getByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState([
        {
          ...stateChangesApprove[0],
          amount: '1461501637330902918203684832716283019655932542975',
        },
      ]),
    });

    expect(await getByText('Estimated changes')).toBeDefined();
    expect(await getByText('Spending cap')).toBeDefined();

    await waitFor(() => expect(getByText('Unlimited')).toBeDefined());
  });

  it('renders "Unlimited" for backwards compatibility approve DAI', () => {
    const { queryByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState(stateChangesApproveDAI),
    });

    expect(queryByText('Spending cap')).toBeTruthy();
    expect(queryByText('Unlimited')).toBeNull();
  });

  it('renders backwards compatibility revoke DAI', () => {
    const { queryByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState(stateChangesRevokeDAI),
    });

    expect(queryByText('Revoke')).toBeTruthy();
    expect(queryByText('Unlimited')).toBeNull();
  });

  it('renders for ERC712 token', async () => {
    const { findByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState(stateChangesNftListing),
    });

    expect(await findByText('Estimated changes')).toBeOnTheScreen();
    expect(await findByText('Listing price')).toBeOnTheScreen();
    expect(await findByText('You list')).toBeOnTheScreen();
    expect(await findByText('#22222')).toBeOnTheScreen();
  });

  it('renders for ERC1155 token', async () => {
    const { findByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState(stateChangesListingERC1155),
    });

    expect(await findByText('Estimated changes')).toBeOnTheScreen();
    expect(await findByText('You receive')).toBeOnTheScreen();
    expect(await findByText('You list')).toBeOnTheScreen();
    expect(await findByText('#77789')).toBeOnTheScreen();
  });

  it('renders label only once if there are multiple state changes of same changeType', async () => {
    const { getAllByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState([
        stateChangesApprove[0],
        stateChangesApprove[0],
        stateChangesApprove[0],
      ]),
    });

    expect(await getAllByText('Spending cap')).toHaveLength(1);
    await waitFor(() => expect(getAllByText('12,345')).toHaveLength(3));
  });

  it('renders unavailable message if no state change is returned', async () => {
    const { getByText } = renderWithProvider(<TypedSignDecoded />, {
      state: mockState([]),
    });

    expect(await getByText('Estimated changes')).toBeDefined();
    expect(await getByText('Unavailable')).toBeDefined();
  });

  describe('getStateChangeToolip', () => {
    it('return correct tooltip when permit is for listing NFT', () => {
      const tooltip = getStateChangeToolip(StateChangeType.NFTListingReceive);
      expect(tooltip).toBe(
        strings('confirm.simulation.decoded_tooltip_list_nft'),
      );
    });

    it('return correct tooltip when permit is for bidding NFT', () => {
      const tooltip = getStateChangeToolip(StateChangeType.NFTBiddingReceive);
      expect(tooltip).toBe(
        strings('confirm.simulation.decoded_tooltip_bid_nft'),
      );
    });
  });

  describe('getStateChangeType', () => {
    it('return correct state change type for NFT listing receive', () => {
      const stateChange = getStateChangeType(
        stateChangesNftListing,
        stateChangesNftListing[1],
      );
      expect(stateChange).toBe(StateChangeType.NFTListingReceive);
    });

    it('return correct state change type for NFT bidding receive', () => {
      const stateChange = getStateChangeType(
        stateChangesNftBidding,
        stateChangesNftBidding[1],
      );
      expect(stateChange).toBe(StateChangeType.NFTBiddingReceive);
    });
  });
});
