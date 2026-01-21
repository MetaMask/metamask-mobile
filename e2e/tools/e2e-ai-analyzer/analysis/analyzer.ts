/**
 * E2E AI Analyzer
 *
 * Functional orchestrator for AI-powered E2E test analysis.
 * Uses the Skills architecture for modular, extensible analysis.
 * Provider-agnostic: works with Anthropic, OpenAI, or Google.
 */

import { SkillContext } from '../types';
import { ILLMProvider } from '../providers';
import { SkillRegistry, SkillExecutor } from '../skills';

/**
 * Analysis context containing all parameters needed for the analysis
 */
export interface AnalysisContext {
  baseDir: string;
  baseBranch: string;
  prNumber?: number;
  githubRepo?: string;
}

/**
 * Skill-based analysis using SkillExecutor
 *
 * Uses the Skills architecture for modular, extensible AI analysis.
 */
export async function analyzeWithSkill<TOutput>(
  provider: ILLMProvider,
  skillName: string,
  allChangedFiles: string[],
  criticalFiles: string[],
  context: AnalysisContext,
): Promise<TOutput> {
  // Get the skill from registry
  const skill = SkillRegistry.get(skillName);

  // Build skill context
  const skillContext: SkillContext = {
    baseDir: context.baseDir,
    baseBranch: context.baseBranch,
    prNumber: context.prNumber,
    githubRepo: context.githubRepo,
    changedFiles: allChangedFiles,
    criticalFiles,
  };

  // Create executor and run
  const executor = new SkillExecutor(skill);
  const result = await executor.execute(provider, skillContext);

  return result as TOutput;
}
