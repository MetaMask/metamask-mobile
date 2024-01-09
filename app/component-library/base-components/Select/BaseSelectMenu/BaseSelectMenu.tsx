/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import BaseSelectableMenu from '../../Selectable/BaseSelectableMenu';

// Internal dependencies.
import { BaseSelectMenuProps } from './BaseSelectMenu.types';

const BaseSelectMenu: React.FC<BaseSelectMenuProps> = ({ ...props }) => (
  <BaseSelectableMenu {...props} />
);

export default BaseSelectMenu;
