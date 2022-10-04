import React from 'react'
import { storiesOf } from '@storybook/react-native'
import CustomSpend from './CustomSpend'
import {DEFAULT_CUSTOM_DESCRIPTION} from './CustomSpend.constants'


storiesOf('Component Library / CustomSpend', module)
    .add('Default', () => (
        <CustomSpend description={DEFAULT_CUSTOM_DESCRIPTION} />
    ))
    .add('Empty State', () => (
        <CustomSpend description={DEFAULT_CUSTOM_DESCRIPTION} />
    ))