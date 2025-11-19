import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Clipboard from '@react-native-clipboard/clipboard';
import { useStyles } from '../../../component-library/hooks';
import { AccountSyncTracker } from '../../../util/performance/AccountSyncTracker';
import styleSheet from './PerformanceDebugModal.styles';

interface PerformanceDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PerformanceDebugModal: React.FC<PerformanceDebugModalProps> = ({
  visible,
  onClose,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [report, setReport] = useState('');

  const generateReport = () => {
    const generatedReport = AccountSyncTracker.generateReport();
    setReport(generatedReport);
  };

  const copyToClipboard = () => {
    if (report) {
      Clipboard.setString(report);
      console.log('✅ Performance report copied to clipboard');
      Alert.alert('Copied', 'Performance report copied to clipboard');
    }
  };

  const resetTracker = () => {
    AccountSyncTracker.reset();
    setReport('');
    Alert.alert('Reset', 'Performance tracker has been reset');
    generateReport(); // Generate fresh report after reset
  };

  React.useEffect(() => {
    if (visible) {
      generateReport();
    }
  }, [visible]);

  return (
    <Modal
      isVisible={visible}
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
          <Text style={styles.title}>Account Sync Performance Report</Text>
          <Text style={styles.subtitle}>
            Performance tracking for account sync operations
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {report ? (
            <View style={styles.reportContainer}>
              <Text style={styles.reportText}>{report}</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No data collected yet. Open the account selector to start tracking.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={generateReport}
          >
            <Text style={styles.secondaryButtonText}>Refresh</Text>
          </TouchableOpacity>
          
          {report && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={copyToClipboard}
            >
              <Text style={styles.secondaryButtonText}>Copy</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetTracker}
          >
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onClose}
          >
            <Text style={styles.primaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

