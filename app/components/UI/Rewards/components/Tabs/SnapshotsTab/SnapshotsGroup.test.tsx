import React from 'react';
import { render } from '@testing-library/react-native';
import SnapshotsGroup from './SnapshotsGroup';
import { SnapshotTile } from '../../SnapshotTile';
import type { SnapshotDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: { HeadingMd: 'HeadingMd' },
}));

jest.mock('../../SnapshotTile', () => ({
  SnapshotTile: jest.fn(() => null),
}));

const createTestSnapshot = (
  overrides: Partial<SnapshotDto> = {},
): SnapshotDto => ({
  id: 'snapshot-1',
  seasonId: 'season-1',
  name: 'Test Airdrop',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 'Ethereum',
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  backgroundImage: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  ...overrides,
});

describe('SnapshotsGroup', () => {
  const mockSnapshotTile = SnapshotTile as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when snapshots array is empty', () => {
    const { toJSON } = render(<SnapshotsGroup title="Active" snapshots={[]} />);

    expect(toJSON()).toBeNull();
  });

  it('renders title text when snapshots exist', () => {
    const snapshots = [createTestSnapshot()];

    const { getByText } = render(
      <SnapshotsGroup title="Active Snapshots" snapshots={snapshots} />,
    );

    expect(getByText('Active Snapshots')).toBeOnTheScreen();
  });

  it('renders SnapshotTile for each snapshot', () => {
    const snapshots = [
      createTestSnapshot({ id: 'snapshot-1', name: 'Snapshot One' }),
      createTestSnapshot({ id: 'snapshot-2', name: 'Snapshot Two' }),
      createTestSnapshot({ id: 'snapshot-3', name: 'Snapshot Three' }),
    ];

    render(<SnapshotsGroup title="Test" snapshots={snapshots} />);

    expect(mockSnapshotTile).toHaveBeenCalledTimes(3);
    expect(mockSnapshotTile).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ snapshot: snapshots[0] }),
      expect.anything(),
    );
    expect(mockSnapshotTile).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ snapshot: snapshots[1] }),
      expect.anything(),
    );
    expect(mockSnapshotTile).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ snapshot: snapshots[2] }),
      expect.anything(),
    );
  });

  it('applies testID prop to container', () => {
    const snapshots = [createTestSnapshot()];

    const { getByTestId } = render(
      <SnapshotsGroup
        title="Test"
        snapshots={snapshots}
        testID="test-snapshots-group"
      />,
    );

    expect(getByTestId('test-snapshots-group')).toBeOnTheScreen();
  });

  it('does not apply testID when not provided', () => {
    const snapshots = [createTestSnapshot()];

    const { queryByTestId } = render(
      <SnapshotsGroup title="Test" snapshots={snapshots} />,
    );

    expect(queryByTestId('test-snapshots-group')).toBeNull();
  });
});
