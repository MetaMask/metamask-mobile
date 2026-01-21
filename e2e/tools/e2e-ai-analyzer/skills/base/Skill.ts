import { LLMTool } from '../../providers/types';
import { SkillContext, SkillDependency, SkillMetadata } from '../../types';
/**
 * Abstract base class for all Skills
 *
 * Skills are modular, reusable AI agents that perform specific analysis tasks.
 * Each skill wraps existing mode implementations with a consistent interface.
 *
 *
 * @template SkillInput - Additional input data the skill needs beyond the standard SkillContext.
  Use `void` if the skill only needs the context (most common case).
 * Example: Configuration options, user preferences, etc.
 *
 * @template SkillResult - The structured data this skill produces after analysis.
 * Example: `SelectTagsAnalysis` with selectedTags, riskLevel, confidence, reasoning
 *
 */

export abstract class Skill<SkillInput = void, SkillResult = unknown> {
  // Metadata - must be implemented by subclasses
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  // Dependencies (optional)
  dependencies: SkillDependency[] = [];

  /**
   * Get the tools this skill can use during AI analysis
   * The AI will have access to call these tools to gather information and complete its task
   *
   * @returns Array of LLM tool definitions (read_file, get_git_diff, grep_codebase, etc.)
   *
   * @example
   * getTools() {
   *   return [
   *     read_file,
   *     get_git_diff,
   *     find_related_files,
   *     finalize_tag_selection
   *   ];
   * }
   */
  abstract getTools(): LLMTool[];

  /**
   * Get the name of the finalize tool that signals analysis completion
   * When the AI calls this tool, the skill knows to stop and process the final result
   *
   * @returns The tool name (e.g., 'finalize_tag_selection', 'finalize_gap_detection')
   *
   * @example
   * getFinalizeToolName() {
   *   return 'finalize_tag_selection';
   * }
   */
  abstract getFinalizeToolName(): string;

  /**
   * Build the system prompt that defines the AI's role and capabilities
   * This sets up who the AI is, what it knows, and how it should behave
   *
   * @param context - Standard skill context for conditional prompt building
   * @returns The system prompt string sent to the LLM
   *
   * @example
   * buildSystemPrompt(context) {
   *   return `You are an expert E2E test engineer.
   *           Your role is to analyze code changes and select appropriate test tags.
   *           You have access to tools for reading files and searching the codebase.`;
   * }
   */
  abstract buildSystemPrompt(context: SkillContext): string;

  /**
   * Build the task prompt for this skill
   * This provides the AI with the specific analysis task and relevant data
   *
   * @param context - Standard skill context (changed files, PR info, base directory, etc.)
   * @param input - Optional skill-specific input data (defined by SkillInput generic type)
   * @returns The task prompt string that tells the AI what to analyze
   */
  abstract buildTaskPrompt(context: SkillContext, input?: SkillInput): string;

  /**
   * Process the raw AI response and extract the typed result
   * Called when the AI completes its analysis by invoking the finalize tool
   *
   * @param raw - Raw string response from the AI's finalize tool call
   * @returns Parsed result object (SkillResult type), or null if parsing fails
   */
  abstract processResult(raw: string): Promise<SkillResult | null>;

  /**
   * Create a conservative fallback result when AI analysis fails
   * This should implement a "safe maximum" strategy to avoid missing issues
   *
   * @param context - Standard skill context
   * @returns A conservative SkillResult (e.g., run all tests when in doubt)
   *
   * @example
   * // For test selection: return all available test tags
   * // For gap detection: report all potential gaps
   */
  abstract createConservativeResult(context: SkillContext): SkillResult;

  /**
   * Create an empty result when no analysis work is needed
   * This should implement a "safe minimum" for cases with no relevant changes
   *
   * @returns An empty SkillResult (e.g., no tests needed for doc-only changes)
   *
   * @example
   * // For test selection: return empty array of tags
   * // For gap detection: return no gaps found
   */
  abstract createEmptyResult(): SkillResult;

  /**
   * Output the skill result to console and/or file
   * Handles displaying and persisting the analysis results for users and CI systems
   *
   * @param result - The skill's completed analysis result (SkillResult type)
   */
  abstract outputResult(result: SkillResult): void;

  /**
   * Get skill metadata for discovery and documentation
   * Used by SkillRegistry.list() to show available skills to users
   *
   * @returns Metadata object containing name, version, description, and dependencies
   *
   * @example
   * // Show all available skills
   * SkillRegistry.list().forEach(metadata => {
   *   console.log(`${metadata.name} (v${metadata.version}): ${metadata.description}`);
   * });
   */
  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      dependencies: this.dependencies,
    };
  }

  /**
   * Validate that all required skill dependencies are available in the registry
   * Called before skill execution to ensure dependencies are satisfied
   *
   * Currently not implemented - will be used when skill composition is needed.
   * For now, all skills are independent and don't depend on other skills.
   *
   * @throws Error if a required dependency skill is not found in SkillRegistry
   *
   * @example
   * // Future: A skill that depends on other skills
   * dependencies = [
   *   { skillName: 'select-tags', required: true }
   * ];
   */
  validateDependencies(): void {
    // Dependency validation will be implemented when needed
    // For now, skills are independent
  }
}
