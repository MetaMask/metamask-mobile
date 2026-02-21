import React from 'react';
import { render } from '@testing-library/react-native';
import DropsGroup from './DropsGroup';
import DropTile from '../../DropTile/DropTile';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: { HeadingMd: 'HeadingMd' },
}));

jest.mock('../../DropTile/DropTile', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const createTestDrop = (
  overrides: Partial<SeasonDropDto> = {},
): SeasonDropDto => ({
  id: 'drop-1',
  seasonId: 'season-1',
  name: 'Test Airdrop',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 1,
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  image: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  status: DropStatus.OPEN,
  ...overrides,
});

describe('DropsGroup', () => {
  const mockDropTile = DropTile as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when drops array is empty', () => {
    const { toJSON } = render(<DropsGroup title="Active" drops={[]} />);

    expect(toJSON()).toBeNull();
  });

  it('renders title text when drops exist', () => {
    const drops = [createTestDrop()];

    const { getByText } = render(
      <DropsGroup title="Active Drops" drops={drops} />,
    );

    expect(getByText('Active Drops')).toBeOnTheScreen();
  });

  it('renders DropTile for each drop', () => {
    const drops = [
      createTestDrop({ id: 'drop-1', name: 'Drop One' }),
      createTestDrop({ id: 'drop-2', name: 'Drop Two' }),
      createTestDrop({ id: 'drop-3', name: 'Drop Three' }),
    ];

    render(<DropsGroup title="Test" drops={drops} />);

    expect(mockDropTile).toHaveBeenCalledTimes(3);
    expect(mockDropTile).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ drop: drops[0] }),
      expect.anything(),
    );
    expect(mockDropTile).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ drop: drops[1] }),
      expect.anything(),
    );
    expect(mockDropTile).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ drop: drops[2] }),
      expect.anything(),
    );
  });

  it('applies testID prop to container', () => {
    const drops = [createTestDrop()];

    const { getByTestId } = render(
      <DropsGroup title="Test" drops={drops} testID="test-drops-group" />,
    );

    expect(getByTestId('test-drops-group')).toBeOnTheScreen();
  });

  it('does not apply testID when not provided', () => {
    const drops = [createTestDrop()];

    const { queryByTestId } = render(<DropsGroup title="Test" drops={drops} />);

    expect(queryByTestId('test-drops-group')).toBeNull();
  });
});
