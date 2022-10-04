import React, {useState} from 'react';
import {TextInput, Text, View} from 'react-native';
import {CustomSpendNumberProps} from './CustomSpendNumber.types'

const CustomSpendNumber = ({value, symbol}: CustomSpendNumberProps) => {
    const [newNumber, onChangeNumber] = useState(value);
    return (
      <View style={{backgroundColor: 'grey', borderRadius: 4, padding: 7, marginVertical: 5, flexDirection: 'row', justifyContent: 'space-between'}}>
        <TextInput
        onChangeText={onChangeNumber}
        value={newNumber}
        placeholder="Enter a number here"
        keyboardType="numeric"
        // autoFocus
      />
      <Text>Max</Text>
      </View>
    )
};

    export default CustomSpendNumber;