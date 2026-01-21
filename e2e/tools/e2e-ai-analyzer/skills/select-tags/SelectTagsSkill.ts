/**
 * SelectTagsSkill
 *
 * Wraps the existing select-tags implementation with the Skill interface.
 * Uses existing handlers and prompts from the same directory.
 */

import { Skill } from '../base/Skill';
import { SkillContext, SelectTagsAnalysis } from '../../types';
import { LLMTool } from '../../providers/types';
import { getToolDefinitions } from '../../ai-tools/tool-registry';
import { buildSystemPrompt, buildTaskPrompt } from './prompt';
import {
  processAnalysis,
  createConservativeResult,
  createEmptyResult,
  outputAnalysis,
} from './handlers';

export class SelectTagsSkill extends Skill<void, SelectTagsAnalysis> {
  readonly name = 'select-tags';
  readonly version = '2.0.0';
  readonly description = 'Analyze code changes and select E2E test tags to run';

  getTools(): LLMTool[] {
    return getToolDefinitions();
  }

  getFinalizeToolName(): string {
    return 'finalize_tag_selection';
  }

  buildSystemPrompt(_context: SkillContext): string {
    return buildSystemPrompt();
  }

  buildTaskPrompt(context: SkillContext): string {
    return buildTaskPrompt(context.changedFiles, context.criticalFiles);
  }

  async processResult(raw: string): Promise<SelectTagsAnalysis | null> {
    return processAnalysis(raw, '');
  }

  createConservativeResult(_context: SkillContext): SelectTagsAnalysis {
    return createConservativeResult();
  }

  createEmptyResult(): SelectTagsAnalysis {
    return createEmptyResult();
  }

  outputResult(result: SelectTagsAnalysis): void {
    outputAnalysis(result);
  }
}
