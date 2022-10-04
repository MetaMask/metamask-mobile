import React from 'react'
import { Text, View } from 'react-native'
import Card from '../../components/Cards/Card';
import {CustomSpendProps} from './CustomSpend.types'
import CustomSpendNumber from './CustomSpendNumber'

const CustomSpend = ({description, value, symbol, }: CustomSpendProps) => (
    <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text>Custom spending cap</Text>
        <Text>Use default</Text>
        </View>
        <CustomSpendNumber value={value} symbol={symbol} />
        <Text>{description}</Text>
    </Card>
)

export default CustomSpend