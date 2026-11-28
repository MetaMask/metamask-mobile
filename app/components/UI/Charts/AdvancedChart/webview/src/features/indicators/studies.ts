// Study presets — resolves the createStudy() arguments for an indicator from
// the RN-supplied registry (window.CONFIG.indicatorDefinitions).
//
// The WebView holds no indicator knowledge of its own: study names, inputs,
// colors and pane placement all come from
// app/components/UI/Charts/AdvancedChart/indicatorRegistry.ts (merged with any
// consumer `indicatorDefinitions`). Names without a definition fall through
// to TradingView's generic createStudy with the name used verbatim.

import type {
  IndicatorDefinitionCfg,
  IndicatorDefinitionsCfg,
  StudyId,
  TVActiveChart,
} from '../../core/types';

export interface StudyPreset {
  studyName: string;
  inputs: Record<string, unknown>;
  overrides: Record<string, unknown>;
  /** 'sub' places the study in a dedicated pane below the main series. */
  pane?: 'main' | 'sub';
}

/** Own-property lookup so names like `constructor` never resolve. */
export function getIndicatorDefinition(
  definitions: IndicatorDefinitionsCfg | undefined,
  name: string,
): IndicatorDefinitionCfg | undefined {
  if (!definitions) return undefined;
  return Object.prototype.hasOwnProperty.call(definitions, name)
    ? definitions[name]
    : undefined;
}

/**
 * Resolves the createStudy preset for `name`. Runtime `inputsOverride`
 * (from ADD_INDICATOR) is shallow-merged over the definition's inputs.
 */
export function resolveStudyPreset(
  name: string,
  definitions: IndicatorDefinitionsCfg | undefined,
  inputsOverride?: Record<string, unknown>,
): StudyPreset {
  const def = getIndicatorDefinition(definitions, name);
  if (!def) {
    return {
      studyName: name,
      inputs: { ...(inputsOverride ?? {}) },
      overrides: {},
    };
  }
  return {
    studyName: def.study.name,
    inputs: { ...(def.study.inputs ?? {}), ...(inputsOverride ?? {}) },
    overrides: { ...(def.study.overrides ?? {}) },
    pane: def.study.pane,
  };
}

export function isSubPanePreset(preset: StudyPreset): boolean {
  return preset.pane === 'sub';
}

/**
 * Creates the indicator study on the given chart, returning the studyId once
 * TradingView resolves the create promise. v30.1.0 `createStudy` resolves to
 * `null` when the study could not be created — surface that as an error.
 */
export function createIndicatorStudy(
  chart: TVActiveChart,
  preset: StudyPreset,
): Promise<StudyId> {
  return chart
    .createStudy(
      preset.studyName,
      false,
      false,
      preset.inputs,
      preset.overrides,
    )
    .then((studyId) => {
      if (!studyId) {
        throw new Error(`createStudy returned null for ${preset.studyName}`);
      }
      return studyId;
    });
}
