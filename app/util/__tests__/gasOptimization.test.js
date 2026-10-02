/**
 * Test suite for Gas Optimization Utilities
 * 
 * @author Anthony Ogugua (CEO/CTO, trustBank)
 */

import BigNumber from 'bignumber.js';
import {
  analyzeNetworkCongestion,
  calculateOptimalGasPrice,
  suggestTransactionBatching,
  getGasOptimizationRecommendations,
  GAS_OPTIMIZATION_STRATEGIES,
  NETWORK_CONGESTION_LEVELS
} from '../gasOptimization';

describe('Gas Optimization Utilities', () => {
  describe('analyzeNetworkCongestion', () => {
    it('should identify low congestion correctly', () => {
      const networkData = {
        pendingTransactions: 1000,
        averageGasPrice: new BigNumber('20'),
        medianGasPrice: new BigNumber('19')
      };
      
      const result = analyzeNetworkCongestion(networkData);
      expect(result).toBe(NETWORK_CONGESTION_LEVELS.LOW);
    });

    it('should identify extreme congestion correctly', () => {
      const networkData = {
        pendingTransactions: 60000,
        averageGasPrice: new BigNumber('100'),
        medianGasPrice: new BigNumber('50')
      };
      
      const result = analyzeNetworkCongestion(networkData);
      expect(result).toBe(NETWORK_CONGESTION_LEVELS.EXTREME);
    });

    it('should handle high price volatility', () => {
      const networkData = {
        pendingTransactions: 3000,
        averageGasPrice: new BigNumber('80'),
        medianGasPrice: new BigNumber('50') // 60% volatility
      };
      
      const result = analyzeNetworkCongestion(networkData);
      expect(result).toBe(NETWORK_CONGESTION_LEVELS.EXTREME);
    });
  });

  describe('calculateOptimalGasPrice', () => {
    const baseGasPrice = new BigNumber('20');
    const priorityFee = new BigNumber('2');

    it('should calculate economy strategy correctly for low congestion', () => {
      const result = calculateOptimalGasPrice(
        GAS_OPTIMIZATION_STRATEGIES.ECONOMY,
        NETWORK_CONGESTION_LEVELS.LOW,
        baseGasPrice,
        priorityFee
      );

      expect(result.maxFeePerGas.toNumber()).toBeCloseTo(21.6); // 20 * 1.0 + 2 * 0.8
      expect(result.maxPriorityFeePerGas.toNumber()).toBeCloseTo(1.6); // 2 * 0.8
      expect(result.estimatedConfirmationTime).toBe(60);
    });

    it('should calculate urgent strategy correctly for extreme congestion', () => {
      const result = calculateOptimalGasPrice(
        GAS_OPTIMIZATION_STRATEGIES.URGENT,
        NETWORK_CONGESTION_LEVELS.EXTREME,
        baseGasPrice,
        priorityFee
      );

      expect(result.maxFeePerGas.toNumber()).toBeCloseTo(68); // 20 * 3.0 + 2 * 4.0
      expect(result.maxPriorityFeePerGas.toNumber()).toBeCloseTo(8); // 2 * 4.0
      expect(result.estimatedConfirmationTime).toBe(60);
    });

    it('should calculate potential savings correctly', () => {
      const result = calculateOptimalGasPrice(
        GAS_OPTIMIZATION_STRATEGIES.ECONOMY,
        NETWORK_CONGESTION_LEVELS.LOW,
        baseGasPrice,
        priorityFee
      );

      expect(result.potentialSavings.isOptimized).toBe(true);
      expect(result.potentialSavings.absoluteSavings.gt(0)).toBe(true);
    });
  });

  describe('suggestTransactionBatching', () => {
    it('should identify batching opportunities', () => {
      const pendingTransactions = [
        { id: '1', to: '0x123', gasLimit: 21000 },
        { id: '2', to: '0x123', gasLimit: 21000 },
        { id: '3', to: '0x456', gasLimit: 50000, data: '0xabc' },
        { id: '4', to: '0x456', gasLimit: 50000, data: '0xdef' }
      ];

      const result = suggestTransactionBatching(pendingTransactions);

      expect(result.hasBatchingOpportunities).toBe(true);
      expect(result.recommendations).toHaveLength(2);
      expect(result.totalPotentialSavings.gt(0)).toBe(true);
    });

    it('should handle no batching opportunities', () => {
      const pendingTransactions = [
        { id: '1', to: '0x123', gasLimit: 21000 },
        { id: '2', to: '0x456', gasLimit: 21000 }
      ];

      const result = suggestTransactionBatching(pendingTransactions);

      expect(result.hasBatchingOpportunities).toBe(false);
      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe('getGasOptimizationRecommendations', () => {
    it('should provide timing recommendations during high congestion', () => {
      const context = {
        urgency: 'low',
        transactionType: 'token_transfer',
        networkConditions: { congestion: NETWORK_CONGESTION_LEVELS.HIGH },
        userPreferences: { costSensitive: true }
      };

      const result = getGasOptimizationRecommendations(context);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('timing');
      expect(result[1].type).toBe('strategy');
    });

    it('should provide strategy recommendations for cost-sensitive users', () => {
      const context = {
        urgency: 'medium',
        transactionType: 'token_transfer',
        networkConditions: { congestion: NETWORK_CONGESTION_LEVELS.LOW },
        userPreferences: { costSensitive: true }
      };

      const result = getGasOptimizationRecommendations(context);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('strategy');
      expect(result[0].message).toContain('Economy mode');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero gas prices gracefully', () => {
      const result = calculateOptimalGasPrice(
        GAS_OPTIMIZATION_STRATEGIES.STANDARD,
        NETWORK_CONGESTION_LEVELS.LOW,
        new BigNumber('0'),
        new BigNumber('0')
      );

      expect(result.maxFeePerGas.gte(0)).toBe(true);
      expect(result.maxPriorityFeePerGas.gte(0)).toBe(true);
      expect(result.potentialSavings.percentageSavings.isFinite()).toBe(true);
      expect(result.potentialSavings.absoluteSavings.isFinite()).toBe(true);
    });

    it('should handle zero median gas price in congestion analysis', () => {
      const networkData = {
        pendingTransactions: 1000,
        averageGasPrice: new BigNumber('20'),
        medianGasPrice: new BigNumber('0')
      };
      
      const result = analyzeNetworkCongestion(networkData);
      expect(result).toBe(NETWORK_CONGESTION_LEVELS.LOW);
    });

    it('should handle undefined transaction context gracefully', () => {
      const result = getGasOptimizationRecommendations();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle partial transaction context', () => {
      const result = getGasOptimizationRecommendations({
        urgency: 'low'
        // Missing networkConditions and userPreferences
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle very large gas prices', () => {
      const largeGasPrice = new BigNumber('1000000');
      const result = calculateOptimalGasPrice(
        GAS_OPTIMIZATION_STRATEGIES.ECONOMY,
        NETWORK_CONGESTION_LEVELS.LOW,
        largeGasPrice,
        new BigNumber('1000')
      );

      expect(result.maxFeePerGas.isFinite()).toBe(true);
      expect(result.maxPriorityFeePerGas.isFinite()).toBe(true);
    });

    it('should handle empty transaction arrays', () => {
      const result = suggestTransactionBatching([]);
      
      expect(result.hasBatchingOpportunities).toBe(false);
      expect(result.recommendations).toHaveLength(0);
      expect(result.totalPotentialSavings.eq(0)).toBe(true);
    });
  });
});