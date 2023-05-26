import React from 'react';
import { render } from '@testing-library/react-native';
import SnapPermissions from '../SnapPermissions';
import { SNAP_PERMISSION_CELL } from '../../../../../../constants/test-ids';

describe('SnapPermissions', () => {
  const mockDate = 1684964145490;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders permissions correctly', () => {
    const permissions = {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
      snap_confirm: {},
      snap_getBip44Entropy: [
        {
          coinType: 1,
        },
        {
          coinType: 461,
        },
      ],
      snap_manageState: {},
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSION_CELL);

    expect(permissionCells.length).toBe(5);
    expect(permissionCells[0].props.children.props.title).toBe(
      'endowment:network-access',
    );
    expect(permissionCells[1].props.children.props.title).toBe('endowment:rpc');
    expect(permissionCells[2].props.children.props.title).toBe('snap_confirm');
    expect(permissionCells[3].props.children.props.title).toBe(
      'snap_getBip44Entropy',
    );
    expect(permissionCells[4].props.children.props.title).toBe(
      'snap_manageState',
    );
  });

  it('renders correct installed date', () => {
    const permissions = {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSION_CELL);

    const expectedDate = 'Approved on May 24 at 5:35 pm';

    expect(permissionCells[0].props.children.props.secondaryText).toBe(
      expectedDate,
    );
    expect(permissionCells[1].props.children.props.secondaryText).toBe(
      expectedDate,
    );
  });

  it('renders correctly with no permissions', () => {
    const permissions = {};
    const { queryByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    expect(queryByTestId(SNAP_PERMISSION_CELL)).toBeNull();
  });
});
