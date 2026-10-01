/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import ButtonPrimary from '../../../components/Buttons/Button/variants/ButtonPrimary';
import ButtonSecondary from '../../../components/Buttons/Button/variants/ButtonSecondary';

// Internal dependencies.
import { ButtonToggleProps } from './ButtonToggle.types';

/**
 * @deprecated Please update your code to use `FilterButton` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/FilterButton/README.md}
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/MIGRATION.md#filterbutton-component Migration docs}
 */
const ButtonToggle = ({ isActive = false, ...props }: ButtonToggleProps) =>
  isActive ? <ButtonPrimary {...props} /> : <ButtonSecondary {...props} />;

export default ButtonToggle;
