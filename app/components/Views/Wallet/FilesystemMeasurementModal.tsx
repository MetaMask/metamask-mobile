import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Modal from 'react-native-modal';
import Clipboard from '@react-native-clipboard/clipboard';
import { useStyles } from '../../../component-library/hooks';
import { MeasurementResult, formatResultForClipboard } from '../../../util/performance/filesystemMeasurement';
import styleSheet from './FilesystemMeasurementModal.styles';

interface FilesystemMeasurementModalProps {
  isVisible: boolean;
  result: MeasurementResult | null;
  isRunning: boolean;
  onClose: () => void;
  onRunAgain: () => void;
}

const FilesystemMeasurementModal: React.FC<FilesystemMeasurementModalProps> = ({
  isVisible,
  result,
  isRunning,
  onClose,
  onRunAgain,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const handleCopyToClipboard = () => {
    if (result) {
      const text = formatResultForClipboard(result);
      Clipboard.setString(text);
      // Could add a toast notification here
      console.log('✅ Results copied to clipboard');
    }
  };

  const formatSize = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  };

  const getPercentageDifference = (): string => {
    if (!result) return '';
    const { singleFileWrite, multiFileWrite } = result;
    const percentage = ((multiFileWrite.averageTime - singleFileWrite.averageTime) / singleFileWrite.averageTime) * 100;
    return `${percentage > 0 ? '+' : ''}${Math.round(percentage)}%`;
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
      style={styles.modal}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Persistence Performance Test</Text>
          <Text style={styles.subtitle}>
            Platform: {Platform.OS.toUpperCase()}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isRunning ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#037DD6" />
              <Text style={styles.loadingText}>
                Running measurement tests...
              </Text>
              <Text style={styles.loadingSubtext}>
                This may take 10-20 seconds
              </Text>
            </View>
          ) : result ? (
            <>
              {/* Test A - Single File */}
              <View style={styles.testSection}>
                <Text style={styles.testLabel}>Test A - Single File Write</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Average Time:</Text>
                  <Text style={styles.resultValue}>{result.singleFileWrite.averageTime}ms</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Runs:</Text>
                  <Text style={styles.resultValueSmall}>
                    {result.singleFileWrite.runs.map(t => `${t}ms`).join(', ')}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Total Size:</Text>
                  <Text style={styles.resultValue}>
                    {formatSize(result.singleFileWrite.totalSize)}
                  </Text>
                </View>
              </View>

              {/* Test B - Multiple Files */}
              <View style={styles.testSection}>
                <Text style={styles.testLabel}>Test B - Multiple File Writes</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Average Time:</Text>
                  <Text style={styles.resultValue}>{result.multiFileWrite.averageTime}ms</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Runs:</Text>
                  <Text style={styles.resultValueSmall}>
                    {result.multiFileWrite.runs.map(t => `${t}ms`).join(', ')}
                  </Text>
                </View>
                <View style={styles.sizesContainer}>
                  <Text style={styles.resultLabel}>Individual Sizes:</Text>
                  {Object.entries(result.multiFileWrite.individualSizes).map(([name, size]) => (
                    <View key={name} style={styles.sizeRow}>
                      <Text style={styles.controllerName}>{name}:</Text>
                      <Text style={styles.sizeValue}>{formatSize(size)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Comparison */}
              <View style={[styles.testSection, styles.comparisonSection]}>
                <Text style={styles.comparisonLabel}>Result</Text>
                <Text style={styles.improvementText}>{result.improvement}</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Difference:</Text>
                  <Text style={styles.differenceValue}>
                    {Math.round(result.multiFileWrite.averageTime - result.singleFileWrite.averageTime)}ms
                    {' '}({getPercentageDifference()})
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No measurement data available</Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {result && !isRunning && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleCopyToClipboard}
            >
              <Text style={styles.secondaryButtonText}>Copy Results</Text>
            </TouchableOpacity>
          )}
          
          {!isRunning && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onRunAgain}
            >
              <Text style={styles.secondaryButtonText}>Run Again</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onClose}
            disabled={isRunning}
          >
            <Text style={styles.primaryButtonText}>
              {isRunning ? 'Please wait...' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilesystemMeasurementModal;

