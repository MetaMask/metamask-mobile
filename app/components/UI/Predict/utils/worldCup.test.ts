import {
  buildPredictWorldCupAllQuery,
  buildPredictWorldCupLiveQuery,
  buildPredictWorldCupPropsQuery,
  buildPredictWorldCupQuery,
  buildPredictWorldCupStageEventsQuery,
  PREDICT_WORLD_CUP_QUERY_TYPES,
  resolvePredictWorldCupStageLabel,
} from './worldCup';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../constants/flags';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.world_cup.stages.group_stage': 'Group Stage',
      'predict.world_cup.stages.final': 'Final',
      'custom.stage': 'Custom Translated',
    };
    return translations[key] ?? key;
  }),
}));

describe('Predict World Cup helpers', () => {
  describe('query helpers', () => {
    it('builds All query with World Cup tag slug', () => {
      expect(buildPredictWorldCupAllQuery(DEFAULT_PREDICT_WORLD_CUP_FLAG)).toBe(
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr',
      );
    });

    it('builds Props query excluding game markets', () => {
      expect(
        buildPredictWorldCupPropsQuery(DEFAULT_PREDICT_WORLD_CUP_FLAG),
      ).toBe(
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&exclude_tag_id=100639&order=volume24hr',
      );
    });

    it('builds Live query with series, games tag, and live filter', () => {
      expect(
        buildPredictWorldCupLiveQuery(DEFAULT_PREDICT_WORLD_CUP_FLAG),
      ).toBe(
        'active=true&archived=false&closed=false&series_id=11433&tag_id=100639&live=true&order=startDate',
      );
    });

    it('builds stage query with repeated event ids', () => {
      expect(
        buildPredictWorldCupStageEventsQuery({ eventIds: ['123', '456'] }),
      ).toBe('active=true&archived=false&closed=false&id=123&id=456');
    });

    it('dispatches query builder by World Cup query type', () => {
      expect(
        buildPredictWorldCupQuery(
          PREDICT_WORLD_CUP_QUERY_TYPES.PROPS,
          DEFAULT_PREDICT_WORLD_CUP_FLAG,
        ),
      ).toBe(
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&exclude_tag_id=100639&order=volume24hr',
      );
    });
  });

  describe('resolvePredictWorldCupStageLabel', () => {
    it('uses labelKey translation first', () => {
      expect(
        resolvePredictWorldCupStageLabel({
          key: 'group_stage',
          labelKey: 'custom.stage',
          label: 'Fallback label',
        }),
      ).toBe('Custom Translated');
    });

    it('falls back to label when labelKey is missing translation', () => {
      expect(
        resolvePredictWorldCupStageLabel({
          key: 'group_stage',
          labelKey: 'missing.stage',
          label: 'Fallback label',
        }),
      ).toBe('Fallback label');
    });

    it('falls back to derived stage label key', () => {
      expect(
        resolvePredictWorldCupStageLabel({
          key: 'final',
        }),
      ).toBe('Final');
    });

    it('falls back to stage key when derived translation is missing', () => {
      expect(
        resolvePredictWorldCupStageLabel({
          key: 'unknown_stage',
        }),
      ).toBe('unknown_stage');
    });
  });
});
