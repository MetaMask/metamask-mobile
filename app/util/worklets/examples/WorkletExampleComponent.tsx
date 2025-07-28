// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRunOnJS, useSharedValue, useWorklet } from 'react-native-worklets-core';

const WorkletExampleComponent = () => {

    const sharedValue = useSharedValue(0);

    const [result, setResult] = useState(0);

    const setResultFromWorklet = useRunOnJS(() => {
        console.log("Calling main JS from worklet!")
        setResult(sharedValue.value)
    }, [])

    const heavyComputationWorklet = useWorklet('default', () => {
        'worklet'
        console.log("Calling worklet!")
        let result = 0;
        for (let i = 0; i < 10000000; i++) {
            result += Math.random();
        }
        sharedValue.value += result;
        setResultFromWorklet()
    }, [sharedValue, setResultFromWorklet])

    const mainJSFunction = () => {
        console.log("hello from main JS function!", sharedValue.value)
        heavyComputationWorklet()
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>After (worklets enabled)</Text>

            <View style={styles.infoBox}>

                <TouchableOpacity style={styles.tertiaryButton} onPress={mainJSFunction}>
                    <Text style={styles.buttonText}>Heavy Computation</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.messageText}>Result: {result}</Text>
            </View>

            <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                    This component demonstrates:
                    {'\n'}• useSharedValue: Shared counter between threads
                    {'\n'}• useWorklet: Functions running on worklet thread
                    {'\n'}• useRunOnJS: Safe JS calls from worklets
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    infoBox: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    counterText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    messageText: {
        fontSize: 14,
        color: '#666',
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    tertiaryButton: {
        backgroundColor: '#FF9500',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    descriptionBox: {
        padding: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    descriptionText: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
});

export default WorkletExampleComponent;
