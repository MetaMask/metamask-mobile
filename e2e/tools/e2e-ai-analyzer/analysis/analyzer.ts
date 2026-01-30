/**
 * E2E AI Analyzer
 *
 * Functional orchestrator for AI-powered E2E test analysis.
 * Supports multiple modes via pluggable architecture.
 * Provider-agnostic: works with Anthropic, OpenAI, or Google.
 */

import { ToolInput, ModeAnalysisTypes } from '../types';
import { LLM_CONFIG } from '../config';
import { getToolDefinitions } from '../ai-tools/tool-registry';
import { executeTool, ToolContext } from '../ai-tools/tool-executor';
import {
  ILLMProvider,
  LLMMessage,
  LLMContentBlock,
  LLMToolResultBlock,
} from '../providers';
import {
  buildSystemPrompt as buildSelectTagsSystemPrompt,
  buildTaskPrompt as buildSelectTagsTaskPrompt,
} from '../modes/select-tags/prompt';
import {
  processAnalysis as processSelectTagsAnalysis,
  createConservativeResult as createSelectTagsConservativeResult,
  createEmptyResult as createSelectTagsEmptyResult,
  outputAnalysis as outputSelectTagsAnalysis,
} from '../modes/select-tags/handlers';

/**
 * Mode Registry
 * Each mode defines its metadata and prompt builders.
 */
export const MODES = {
  'select-tags': {
    description: 'Analyze code changes and select E2E test tags to run',
    finalizeToolName: 'finalize_tag_selection',
    systemPromptBuilder: buildSelectTagsSystemPrompt,
    taskPromptBuilder: buildSelectTagsTaskPrompt,
    processAnalysis: processSelectTagsAnalysis,
    createConservativeResult: createSelectTagsConservativeResult,
    createEmptyResult: createSelectTagsEmptyResult,
    outputAnalysis: outputSelectTagsAnalysis,
  },
  // Future modes (add imports and register here):
  // 'suggest-migration': {
  //   description: 'Identify E2E tests that could be unit/integration tests',
  //   finalizeToolName: 'finalize_migration_suggestions',
  //   systemPromptBuilder: buildMigrationSystemPrompt,
  //   taskPromptBuilder: buildMigrationTaskPrompt,
  //   processAnalysis: migrationHandlers.processAnalysis,
  //   createConservativeFallback: migrationHandlers.createConservativeFallback,
  //   createEmptyResult: migrationHandlers.createEmptyResult,
  //   outputAnalysis: migrationHandlers.outputAnalysis,
  // },
};

// Type aliases for mode keys and analysis results
type ModeKey = keyof typeof MODES;
type ModeAnalysisResult<M extends ModeKey> = ModeAnalysisTypes[M];

/**
 * Validates and returns the mode
 */
export function validateMode(modeInput?: string): ModeKey {
  if (!modeInput) return 'select-tags';

  if (!(modeInput in MODES)) {
    const validModes = Object.keys(MODES).join(', ');
    throw new Error(`Invalid mode: ${modeInput}. Valid modes: ${validModes}`);
  }

  return modeInput as ModeKey;
}

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
 * Main AI analysis using agentic loop with tools
 *
 * @param provider - The LLM provider to use (Anthropic, OpenAI, or Google)
 * @param allChangedFiles - List of all changed files in the PR
 * @param criticalFiles - List of critical files that need special attention
 * @param mode - The analysis mode to use
 * @param context - Analysis context (baseDir, baseBranch, prNumber, githubRepo)
 */
export async function analyzeWithAgent<M extends ModeKey>(
  provider: ILLMProvider,
  allChangedFiles: string[],
  criticalFiles: string[],
  mode: M,
  context: AnalysisContext,
): Promise<ModeAnalysisResult<M>> {
  // Get mode configuration with prompt builders
  const modeConfig = MODES[mode];
  const systemPrompt = modeConfig.systemPromptBuilder();
  const taskPrompt = modeConfig.taskPromptBuilder(
    allChangedFiles,
    criticalFiles,
  );

  const tools = getToolDefinitions();
  let currentMessage: LLMContentBlock[] | string = taskPrompt;
  const conversationHistory: LLMMessage[] = [];

  console.log(`🤖 Using provider: ${provider.displayName}`);

  for (let iteration = 0; iteration < LLM_CONFIG.maxIterations; iteration++) {
    console.log(`🔄 Iteration ${iteration + 1}/${LLM_CONFIG.maxIterations}...`);

    const response = await provider.createMessage({
      model: provider.getDefaultModel(),
      maxTokens: LLM_CONFIG.maxTokens,
      temperature: LLM_CONFIG.temperature,
      system: systemPrompt,
      tools,
      messages: [
        ...conversationHistory,
        { role: 'user', content: currentMessage },
      ],
    });

    // Handle tool uses
    const toolUseBlocks = response.content.filter(
      (block) => block.type === 'tool_use',
    );

    if (toolUseBlocks.length > 0) {
      const toolResults: LLMToolResultBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use') {
          console.log(`🔧 Tool: ${toolUse.name}`);
          const toolResult = await executeTool(
            toolUse.name,
            toolUse.input as ToolInput,
            context as ToolContext,
          );

          // Log tool result with status indicator
          const errorPattern =
            /^(Error:|Invalid|Tool error:|Unknown tool:|File not found:|Directory not found:)|Error (searching|finding|reading)|Could not get|Cannot extract/;
          const emptyPattern = /No (matches found|git diff|related|importers)/;

          const isError = errorPattern.test(toolResult);
          const isEmpty = emptyPattern.test(toolResult);

          let status = '✅';
          if (isError) status = '❌';
          else if (isEmpty) status = '📭';

          const resultPreview = toolResult
            .substring(0, 120)
            .replace(/\n/g, ' ');
          console.log(
            `   ${status} ${resultPreview}${
              toolResult.length > 120 ? '...' : ''
            }`,
          );

          // Handle finalize tool (mode-specific)
          if (toolUse.name === modeConfig.finalizeToolName) {
            const analysis = await modeConfig.processAnalysis(
              toolResult,
              context.baseDir,
            );

            if (analysis) {
              console.log(`✅ Analysis complete!`);
              return analysis as ModeAnalysisResult<M>;
            }

            console.log('⚠️ Failed to parse finalize_tag_selection');
            return modeConfig.createConservativeResult() as ModeAnalysisResult<M>;
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: toolResult.substring(0, 50000),
          });
        }
      }

      // Update conversation history
      conversationHistory.push({
        role: 'user',
        content:
          typeof currentMessage === 'string' ? currentMessage : currentMessage,
      });
      conversationHistory.push({
        role: 'assistant',
        content: response.content,
      });

      currentMessage = toolResults;
      continue;
    }

    // Handle text response (fallback)
    const textContent = response.content.find((block) => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      const analysis = await modeConfig.processAnalysis(
        textContent.text,
        context.baseDir,
      );
      if (analysis) {
        console.log(`✅ Analysis complete!`);
        return analysis as ModeAnalysisResult<M>;
      }
    }

    break;
  }

  console.log('⚠️ Using fallback analysis');
  return modeConfig.createConservativeResult() as ModeAnalysisResult<M>;
}
