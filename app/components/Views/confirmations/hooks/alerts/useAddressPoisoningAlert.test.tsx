import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { AddressPoisoningAlertContent } from '../../components/send/address-poisoning-alert-content/address-poisoning-alert-content';
import { useAddressPoisoningDetection } from '../send/useAddressPoisoningDetection';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useAddressPoisoningAlert } from './useAddressPoisoningAlert';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../transactions/useTransferRecipient', () => ({
  useTransferRecipient: jest.fn(),
}));

jest.mock('../send/useAddressPoisoningDetection', () => ({
  useAddressPoisoningDetection: jest.fn(),
}));

const useTransferRecipientMock = jest.mocked(useTransferRecipient);
const useAddressPoisoningDetectionMock = jest.mocked(
  useAddressPoisoningDetection,
);

describe('useAddressPoisoningAlert', () => {
  const toAddress = '0x1234567890123456789012345678901234567890';
  const knownAddress = '0x123456789012345678901234567890abcdef1234';
  const diffIndices = [32, 33, 34];
  const bestMatch = {
    knownAddress,
    prefixMatchLength: 32,
    suffixMatchLength: 4,
    poisoningScore: 8,
    diffIndices,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useTransferRecipientMock.mockReturnValue(toAddress);
    useAddressPoisoningDetectionMock.mockReturnValue({
      isPoisoningSuspect: false,
      bestMatch: null,
      matches: [],
    });
  });

  it.each([
    {
      name: 'recipient address is missing',
      recipient: undefined,
      detection: {
        isPoisoningSuspect: true,
        bestMatch,
        matches: [bestMatch],
      },
    },
    {
      name: 'address is not a poisoning suspect',
      recipient: toAddress,
      detection: {
        isPoisoningSuspect: false,
        bestMatch,
        matches: [bestMatch],
      },
    },
    {
      name: 'best match is missing',
      recipient: toAddress,
      detection: {
        isPoisoningSuspect: true,
        bestMatch: null,
        matches: [],
      },
    },
  ])('returns empty array when $name', ({ recipient, detection }) => {
    useTransferRecipientMock.mockReturnValue(recipient);
    useAddressPoisoningDetectionMock.mockReturnValue(detection);

    const { result } = renderHook(() => useAddressPoisoningAlert());

    expect(result.current).toEqual([]);
  });

  it('returns address poisoning alert for suspect recipient', () => {
    useAddressPoisoningDetectionMock.mockReturnValue({
      isPoisoningSuspect: true,
      bestMatch,
      matches: [bestMatch],
    });

    const { result } = renderHook(() => useAddressPoisoningAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.AddressPoisoning,
      severity: Severity.Danger,
      title: 'alert_system.address_poisoning.title',
      isBlocking: false,
    });

    const content = result.current[0].content as React.ReactElement<{
      children: React.ReactNode;
    }>;
    const contentChildren = React.Children.toArray(content.props.children);
    const message = contentChildren[0] as React.ReactElement<{
      children: string;
    }>;
    const details = contentChildren[1] as React.ReactElement<{
      address: string;
      knownAddress: string;
      diffIndices: number[];
    }>;

    expect(message.props.children).toBe(
      'alert_system.address_poisoning.message',
    );
    expect(details.type).toBe(AddressPoisoningAlertContent);
    expect(details.props).toMatchObject({
      address: toAddress,
      knownAddress,
      diffIndices,
    });
  });
});
