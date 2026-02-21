/**
 * Gas Optimization Suggestions Component
 * 
 * Provides intelligent gas fee recommendations to users based on
 * network conditions, transaction urgency, and cost optimization strategies.
 * 
 * @author Anthony Ogugua (CEO/CTO, trustBank)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Text from '../../Base/Text';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../locales/i18n';
import Alert, { AlertType } from '../../Base/Alert';
import PropTypes from 'prop-types';
import BigNumber from 'bignumber.js';
import { useTheme } from '../../../util/theme';
import {
  analyzeNetworkCongestion,
  calculateOptimalGasPrice,
  getGasOptimizationRecommendations,
  GAS_OPTIMIZATION_STRATEGIES,
  NETWORK_CONGESTION_LEVELS
} from '../../../util/gasOptimization';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerIcon: {
      marginRight: 8,
      color: colors.primary.default,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      flex: 1,
    },
    strategyContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    strategyButton: {
      flex: 1,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 4,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    strategyButtonSelected: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    strategyText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.default,
      textAlign: 'center',
    },
    strategySubtext: {
      fontSize: 10,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: 2,
    },
    recommendationContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    recommendationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    recommendationIcon: {
      marginRight: 6,
      color: colors.warning.default,
    },
    recommendationText: {
      fontSize: 14,
      color: colors.text.default,
      lineHeight: 20,
    },
    savingsText: {
      fontSize: 12,
      color: colors.success.default,
      fontWeight: '500',
      marginTop: 4,
    },
    networkStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      borderRadius: 8,
      padding: 8,
      marginBottom: 12,
    },
    networkStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    networkStatusText: {
      fontSize: 12,
      color: colors.text.muted,
    },
    optimizationResults: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    resultLabel: {
      fontSize: 12,
      color: colors.text.muted,
    },
    resultValue: {
      fontSize: 12,
      color: colors.text.default,
      fontWeight: '500',
    },
  });

const GasOptimizationSuggestions = ({
  currentGasPrice,
  currentPriorityFee,
  networkData,
  onStrategySelect,
  selectedStrategy = GAS_OPTIMIZATION_STRATEGIES.STANDARD,
  transactionContext = {},
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  const [congestionLevel, setCongestionLevel] = useState(NETWORK_CONGESTION_LEVELS.LOW);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // Extract primitive values from transactionContext to avoid unnecessary re-renders
  const transactionUrgency = transactionContext?.urgency;
  const transactionType = transactionContext?.transactionType;
  const userPreferences = transactionContext?.userPreferences;

  useEffect(() => {
    if (networkData) {
      const congestion = analyzeNetworkCongestion(networkData);
      setCongestionLevel(congestion);
      
      // Calculate optimization results for current strategy
      const results = calculateOptimalGasPrice(
        selectedStrategy,
        congestion,
        currentGasPrice,
        currentPriorityFee
      );
      setOptimizationResults(results);
      
      // Get user-friendly recommendations
      const recs = getGasOptimizationRecommendations({
        urgency: transactionUrgency,
        transactionType: transactionType,
        userPreferences: userPreferences,
        networkConditions: { congestion }
      });
      setRecommendations(recs);
    }
  }, [networkData, selectedStrategy, currentGasPrice, currentPriorityFee, transactionUrgency, transactionType, userPreferences]);

  const getNetworkStatusColor = () => {
    switch (congestionLevel) {
      case NETWORK_CONGESTION_LEVELS.LOW:
        return colors.success.default;
      case NETWORK_CONGESTION_LEVELS.MODERATE:
        return colors.warning.default;
      case NETWORK_CONGESTION_LEVELS.HIGH:
        return colors.error.default;
      case NETWORK_CONGESTION_LEVELS.EXTREME:
        return colors.error.default;
      default:
        return colors.text.muted;
    }
  };

  const getNetworkStatusText = () => {
    switch (congestionLevel) {
      case NETWORK_CONGESTION_LEVELS.LOW:
        return 'Network: Low congestion';
      case NETWORK_CONGESTION_LEVELS.MODERATE:
        return 'Network: Moderate congestion';
      case NETWORK_CONGESTION_LEVELS.HIGH:
        return 'Network: High congestion';
      case NETWORK_CONGESTION_LEVELS.EXTREME:
        return 'Network: Extreme congestion';
      default:
        return 'Network: Unknown';
    }
  };

  const strategyOptions = [
    {
      key: GAS_OPTIMIZATION_STRATEGIES.ECONOMY,
      label: 'Economy',
      subtitle: 'Lowest cost',
      icon: 'leaf-outline'
    },
    {
      key: GAS_OPTIMIZATION_STRATEGIES.STANDARD,
      label: 'Standard',
      subtitle: 'Balanced',
      icon: 'speedometer-outline'
    },
    {
      key: GAS_OPTIMIZATION_STRATEGIES.FAST,
      label: 'Fast',
      subtitle: 'Higher cost',
      icon: 'flash-outline'
    },
    {
      key: GAS_OPTIMIZATION_STRATEGIES.URGENT,
      label: 'Urgent',
      subtitle: 'Highest cost',
      icon: 'rocket-outline'
    }
  ];

  const handleStrategySelect = (strategy) => {
    onStrategySelect(strategy);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcon 
          name="gas-station" 
          size={20} 
          style={styles.headerIcon} 
        />
        <Text style={styles.headerText}>
          Gas Optimization
        </Text>
      </View>

      {/* Network Status */}
      <View style={styles.networkStatusContainer}>
        <View 
          style={[
            styles.networkStatusDot, 
            { backgroundColor: getNetworkStatusColor() }
          ]} 
        />
        <Text style={styles.networkStatusText}>
          {getNetworkStatusText()}
        </Text>
      </View>

      {/* Strategy Selection */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.strategyContainer}
      >
        {strategyOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.strategyButton,
              selectedStrategy === option.key && styles.strategyButtonSelected
            ]}
            onPress={() => handleStrategySelect(option.key)}
          >
            <Icon 
              name={option.icon} 
              size={16} 
              color={
                selectedStrategy === option.key 
                  ? colors.primary.default 
                  : colors.text.muted
              } 
            />
            <Text style={styles.strategyText}>{option.label}</Text>
            <Text style={styles.strategySubtext}>{option.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Optimization Results */}
      {optimizationResults && (
        <View style={styles.optimizationResults}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Estimated confirmation:</Text>
            <Text style={styles.resultValue}>
              {optimizationResults.estimatedConfirmationTime < 60 
                ? `${optimizationResults.estimatedConfirmationTime}s`
                : `${Math.round(optimizationResults.estimatedConfirmationTime / 60)} min`
              }
            </Text>
          </View>
          {optimizationResults.potentialSavings.isOptimized && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Potential savings:</Text>
              <Text style={[styles.resultValue, { color: colors.success.default }]}>
                {optimizationResults.potentialSavings.percentageSavings.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.map((rec, index) => (
        <View key={index} style={styles.recommendationContainer}>
          <View style={styles.recommendationHeader}>
            <Icon 
              name="bulb-outline" 
              size={16} 
              style={styles.recommendationIcon} 
            />
            <Text style={styles.recommendationText}>
              {rec.message}
            </Text>
          </View>
          {rec.potentialSavings && (
            <Text style={styles.savingsText}>
              Potential savings: {rec.potentialSavings}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

GasOptimizationSuggestions.propTypes = {
  currentGasPrice: PropTypes.instanceOf(BigNumber).isRequired,
  currentPriorityFee: PropTypes.instanceOf(BigNumber).isRequired,
  networkData: PropTypes.shape({
    pendingTransactions: PropTypes.number,
    averageGasPrice: PropTypes.instanceOf(BigNumber),
    medianGasPrice: PropTypes.instanceOf(BigNumber),
  }),
  onStrategySelect: PropTypes.func.isRequired,
  selectedStrategy: PropTypes.string,
  transactionContext: PropTypes.shape({
    urgency: PropTypes.string,
    transactionType: PropTypes.string,
    userPreferences: PropTypes.object,
  }),
};

export default GasOptimizationSuggestions;