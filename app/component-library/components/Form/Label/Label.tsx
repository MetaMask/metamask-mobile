/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { LabelProps } from './Label.types';

const Label: React.FC<LabelProps> = ({ ...props }) => (
  <Text variant={TextVariant.BodyMDBold} {...props} />
);

export default Label;
