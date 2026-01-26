/**
 * E2E AI Analyzer
 *
 * Functional orchestrator for AI-powered E2E test analysis.
 * Supports multiple modes via pluggable architecture.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ToolInput, ModeAnalysisTypes } from '../types';
import { CLAUDE_CONFIG } from '../config';
import { getToolDefinitions } from '../ai-tools/tool-registry';
import { executeTool } from '../ai-tools/tool-executor';
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
 * Main AI analysis using agentic loop with tools
 */
export async function analyzeWithAgent<M extends ModeKey>(
  anthropic: Anthropic,
  allChangedFiles: string[],
  criticalFiles: string[],
  mode: M,
  baseDir: string,
  baseBranch: string,
): Promise<ModeAnalysisResult<M>> {
  // Get mode configuration with prompt builders
  const modeConfig = MODES[mode];
  const systemPrompt = modeConfig.systemPromptBuilder();
  const taskPrompt = modeConfig.taskPromptBuilder(
    allChangedFiles,
    criticalFiles,
  );

  const tools = getToolDefinitions();
  let currentMessage: string | Anthropic.MessageParam['content'] = taskPrompt;
  const conversationHistory: Anthropic.MessageParam[] = [];

  for (
    let iteration = 0;
    iteration < CLAUDE_CONFIG.maxIterations;
    iteration++
  ) {
    console.log(
      `🔄 Iteration ${iteration + 1}/${CLAUDE_CONFIG.maxIterations}...`,
    );

    const response: Anthropic.Message = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      temperature: CLAUDE_CONFIG.temperature,
      system: systemPrompt,
      tools,
      messages: [
        ...conversationHistory,
        { role: 'user', content: currentMessage },
      ],
    });

    // Handle tool uses
    const toolUseBlocks = response.content.filter(
      (block: Anthropic.ContentBlock) => block.type === 'tool_use',
    );
    if (toolUseBlocks.length > 0) {
      const toolResults: Anthropic.MessageParam['content'] = [];
      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use') {
          console.log(`🔧 Tool: ${toolUse.name}`);
          const toolResult = await executeTool(
            toolUse.name,
            toolUse.input as ToolInput,
            {
              baseDir,
              baseBranch,
            },
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
              baseDir,
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
        content: currentMessage,
      });
      conversationHistory.push({
        role: 'assistant',
        content: response.content,
      });

      currentMessage = toolResults;
      continue;
    }

    // Handle text response (fallback)
    const textContent = response.content.find(
      (block: Anthropic.ContentBlock) => block.type === 'text',
    );
    if (textContent && textContent.type === 'text') {
      const analysis = await modeConfig.processAnalysis(
        textContent.text,
        baseDir,
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
