/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import BaseListBase from '../foundation/BaseListBase';

// Internal dependencies.
import { BaseListProps } from './BaseList.types';

const BaseList: React.FC<BaseListProps> = ({ style, ...props }) => (
  <BaseListBase {...props} />
);

export default BaseList;
