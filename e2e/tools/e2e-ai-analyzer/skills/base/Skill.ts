import { LLMTool } from '../../providers/types';
import { SkillContext, SkillDependency, SkillMetadata } from '../../types';

/**
 * Abstract base class for all Skills
 *
 * Skills are modular, reusable AI agents that perform specific analysis tasks.
 * Each skill wraps existing mode implementations with a consistent interface.
 *
 * @template SkillInput - Additional input beyond SkillContext (use `void` if not needed)
 * @template SkillResult - The structured output after analysis
 */
export abstract class Skill<SkillInput = void, SkillResult = unknown> {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  dependencies: SkillDependency[] = [];

  /** Returns tools available to the AI during analysis */
  abstract getTools(): LLMTool[];

  /** Returns the tool name that signals analysis completion */
  abstract getFinalizeToolName(): string;

  /** Builds the system prompt defining the AI's role and behavior */
  abstract buildSystemPrompt(context: SkillContext): string;

  /** Builds the task prompt for the specific analysis */
  abstract buildTaskPrompt(context: SkillContext, input?: SkillInput): string;

  /** Processes the raw AI response into typed result */
  abstract processResult(raw: string): Promise<SkillResult | null>;

  /** Creates a conservative fallback result when analysis fails */
  abstract createConservativeResult(context: SkillContext): SkillResult;

  /** Creates an empty result when no analysis is needed */
  abstract createEmptyResult(): SkillResult;

  /** Outputs the result to console and/or file */
  abstract outputResult(result: SkillResult): void;

  /** Returns skill metadata for registry discovery */
  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      dependencies: this.dependencies,
    };
  }

  /** Validates dependencies are available (currently no-op) */
  validateDependencies(): void {
    // Will be implemented when skill composition is needed
  }
}
