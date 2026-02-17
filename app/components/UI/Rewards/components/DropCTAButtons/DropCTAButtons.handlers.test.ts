/**
 * Unit tests for DropCTAButtons handlers
 */

import { Linking } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { SHIELD_WEBSITE_URL } from '../../../../../constants/shield';
import type {
  PointsEventEarnType,
  DropPrerequisiteDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  CTA_CONFIG,
  getConditionsWithActivityTypes,
  type CTAHandlerParams,
} from './DropCTAButtons.handlers';

// Mock Linking
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

describe('DropCTAButtons.handlers', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockGoToSwaps = jest.fn();

  const baseParams: CTAHandlerParams = {
    navigation: mockNavigation,
    goToSwaps: mockGoToSwaps,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CTA_CONFIG', () => {
    describe('SWAP handler', () => {
      it('calls goToSwaps', () => {
        const config = CTA_CONFIG.SWAP;
        expect(config?.label).toBe('Swap');

        config?.handler(baseParams, {} as DropPrerequisiteDto);

        expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
      });
    });

    describe('PERPS handler', () => {
      it('navigates to tutorial for first-time users', () => {
        const config = CTA_CONFIG.PERPS;
        expect(config?.label).toBe('Trade');

        const params = { ...baseParams, isFirstTimePerpsUser: true };
        config?.handler(params, {} as DropPrerequisiteDto);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.PERPS.TUTORIAL,
        );
      });

      it('navigates to Perps home for returning users', () => {
        const config = CTA_CONFIG.PERPS;

        const params = { ...baseParams, isFirstTimePerpsUser: false };
        config?.handler(params, {} as DropPrerequisiteDto);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.PERPS_HOME,
          },
        );
      });

      it('navigates to Perps home when isFirstTimePerpsUser is undefined', () => {
        const config = CTA_CONFIG.PERPS;

        config?.handler(baseParams, {} as DropPrerequisiteDto);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.PERPS_HOME,
          },
        );
      });
    });

    describe('PREDICT handler', () => {
      it('navigates to Predict market list', () => {
        const config = CTA_CONFIG.PREDICT;
        expect(config?.label).toBe('Predict');

        config?.handler(baseParams, {} as DropPrerequisiteDto);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.PREDICT.ROOT,
          {
            screen: Routes.PREDICT.MARKET_LIST,
          },
        );
      });
    });

    describe('CARD handler', () => {
      it('navigates to Card welcome screen', () => {
        const config = CTA_CONFIG.CARD;
        expect(config?.label).toBe('Get Card');

        config?.handler(baseParams, {} as DropPrerequisiteDto);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });
    });

    describe('MUSD_DEPOSIT handler', () => {
      it('navigates to Earn mUSD conversion education', () => {
        const config = CTA_CONFIG.MUSD_DEPOSIT;
        expect(config?.label).toBe('Deposit mUSD');

        config?.handler(baseParams, {} as DropPrerequisiteDto);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
          screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        });
      });
    });

    describe('SHIELD handler', () => {
      it('opens Shield website URL', () => {
        const config = CTA_CONFIG.SHIELD;
        expect(config?.label).toBe('Shield');

        config?.handler(baseParams, {} as DropPrerequisiteDto);

        expect(Linking.openURL).toHaveBeenCalledWith(SHIELD_WEBSITE_URL);
      });
    });

    it('has handler for all expected activity types', () => {
      const expectedTypes: PointsEventEarnType[] = [
        'SWAP',
        'PERPS',
        'PREDICT',
        'CARD',
        'MUSD_DEPOSIT',
        'SHIELD',
      ];

      expectedTypes.forEach((type) => {
        expect(CTA_CONFIG[type]).toBeDefined();
        expect(CTA_CONFIG[type]?.label).toBeTruthy();
        expect(CTA_CONFIG[type]?.handler).toBeInstanceOf(Function);
      });
    });
  });

  describe('getConditionsWithActivityTypes', () => {
    it('returns empty array for empty conditions', () => {
      const result = getConditionsWithActivityTypes([]);

      expect(result).toEqual([]);
    });

    it('extracts unique activity types with CTA handlers', () => {
      const conditions: DropPrerequisiteDto[] = [
        {
          activityTypes: ['SWAP', 'PERPS'],
        } as DropPrerequisiteDto,
        {
          activityTypes: ['PREDICT'],
        } as DropPrerequisiteDto,
      ];

      const result = getConditionsWithActivityTypes(conditions);

      expect(result).toHaveLength(3);
      expect(result[0].activityType).toBe('SWAP');
      expect(result[1].activityType).toBe('PERPS');
      expect(result[2].activityType).toBe('PREDICT');
    });

    it('deduplicates activity types', () => {
      const conditions: DropPrerequisiteDto[] = [
        {
          activityTypes: ['SWAP', 'PERPS'],
        } as DropPrerequisiteDto,
        {
          activityTypes: ['SWAP', 'PREDICT'],
        } as DropPrerequisiteDto,
      ];

      const result = getConditionsWithActivityTypes(conditions);

      expect(result).toHaveLength(3);
      const activityTypes = result.map((r) => r.activityType);
      expect(activityTypes).toEqual(['SWAP', 'PERPS', 'PREDICT']);
    });

    it('filters out activity types without CTA handlers', () => {
      const conditions: DropPrerequisiteDto[] = [
        {
          activityTypes: ['SWAP', 'UNKNOWN_TYPE' as PointsEventEarnType],
        } as DropPrerequisiteDto,
      ];

      const result = getConditionsWithActivityTypes(conditions);

      expect(result).toHaveLength(1);
      expect(result[0].activityType).toBe('SWAP');
    });

    it('preserves source condition reference', () => {
      const condition1: DropPrerequisiteDto = {
        activityTypes: ['SWAP'],
      } as DropPrerequisiteDto;
      const condition2: DropPrerequisiteDto = {
        activityTypes: ['PREDICT'],
      } as DropPrerequisiteDto;

      const result = getConditionsWithActivityTypes([condition1, condition2]);

      expect(result[0].condition).toBe(condition1);
      expect(result[1].condition).toBe(condition2);
    });

    it('handles condition with multiple activity types', () => {
      const condition: DropPrerequisiteDto = {
        activityTypes: ['SWAP', 'PERPS', 'PREDICT', 'CARD'],
      } as DropPrerequisiteDto;

      const result = getConditionsWithActivityTypes([condition]);

      expect(result).toHaveLength(4);
      result.forEach((item) => {
        expect(item.condition).toBe(condition);
      });
    });

    it('returns first occurrence when duplicate activity types span conditions', () => {
      const condition1: DropPrerequisiteDto = {
        activityTypes: ['SWAP'],
      } as DropPrerequisiteDto;
      const condition2: DropPrerequisiteDto = {
        activityTypes: ['SWAP'],
      } as DropPrerequisiteDto;

      const result = getConditionsWithActivityTypes([condition1, condition2]);

      expect(result).toHaveLength(1);
      expect(result[0].condition).toBe(condition1);
    });

    it('handles empty activityTypes array', () => {
      const conditions: DropPrerequisiteDto[] = [
        {
          activityTypes: [] as PointsEventEarnType[],
        } as DropPrerequisiteDto,
      ];

      const result = getConditionsWithActivityTypes(conditions);

      expect(result).toEqual([]);
    });

    it('handles all supported activity types', () => {
      const conditions: DropPrerequisiteDto[] = [
        {
          activityTypes: [
            'SWAP',
            'PERPS',
            'PREDICT',
            'CARD',
            'MUSD_DEPOSIT',
            'SHIELD',
          ],
        } as DropPrerequisiteDto,
      ];

      const result = getConditionsWithActivityTypes(conditions);

      expect(result).toHaveLength(6);
      expect(result.map((r) => r.activityType)).toEqual([
        'SWAP',
        'PERPS',
        'PREDICT',
        'CARD',
        'MUSD_DEPOSIT',
        'SHIELD',
      ]);
    });
  });
});
