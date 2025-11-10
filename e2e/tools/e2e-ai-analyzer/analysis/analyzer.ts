/**
 * E2E AI Analyzer
 *
 * Functional orchestrator for AI-powered E2E test analysis.
 * Supports multiple modes via pluggable architecture.
 */

import Anthropic from '@anthropic-ai/sdk';
import { SelectTagsAnalysis, FileCategorization, ToolInput } from '../types';
import { CLAUDE_CONFIG } from '../config';
import { parseAgentDecision } from './decision-parser';
import { getToolDefinitions } from '../ai-tools/tool-registry';
import { executeTool } from '../ai-tools/tool-executor';
import { buildSystemPrompt as buildSelectTagsSystemPrompt } from '../modes/select-tags/system-prompt';
import { buildTaskPrompt as buildSelectTagsTaskPrompt } from '../modes/select-tags/task-prompt';
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
  //   systemPromptBuilder: buildMigrationSystemPrompt,
  //   taskPromptBuilder: buildMigrationTaskPrompt,
  //   processAnalysis: migrationHandlers.processAnalysis,
  //   createConservativeFallback: migrationHandlers.createConservativeFallback,
  //   createEmptyResult: migrationHandlers.createEmptyResult,
  //   outputAnalysis: migrationHandlers.outputAnalysis,
  // },
};

export type ModeKey = keyof typeof MODES;

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
export async function analyzeWithAgent(
  anthropic: Anthropic,
  categorization: FileCategorization,
  mode: ModeKey,
  baseDir: string,
  baseBranch: string,
  isQuietMode: boolean,
  log: (msg: string) => void,
): Promise<SelectTagsAnalysis> {
  // Get mode configuration with prompt builders
  const modeConfig = MODES[mode];
  const systemPrompt = modeConfig.systemPromptBuilder();
  const taskPrompt = modeConfig.taskPromptBuilder(categorization);

  const tools = getToolDefinitions();
  let currentMessage: string | Anthropic.MessageParam['content'] = taskPrompt;
  const conversationHistory: Anthropic.MessageParam[] = [];

  for (
    let iteration = 0;
    iteration < CLAUDE_CONFIG.maxIterations;
    iteration++
  ) {
    log(`🔄 Iteration ${iteration + 1}/${CLAUDE_CONFIG.maxIterations}...`);

    const response: Anthropic.Message = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: CLAUDE_CONFIG.thinkingBudgetTokens,
      },
      system: systemPrompt,
      tools,
      messages: [
        ...conversationHistory,
        { role: 'user', content: currentMessage },
      ],
    });

    // Log thinking (if present)
    const thinking = response.content.find(
      (block: Anthropic.ContentBlock) => block.type === 'thinking',
    );
    if (thinking && 'thinking' in thinking) {
      log(`💭 ${thinking.thinking.substring(0, 200)}...`);
    }

    // Handle tool uses
    const toolUseBlocks = response.content.filter(
      (block: Anthropic.ContentBlock) => block.type === 'tool_use',
    );

    if (toolUseBlocks.length > 0) {
      const toolResults: Anthropic.MessageParam['content'] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use') {
          log(`🔧 Tool: ${toolUse.name}`);

          const toolResult = await executeTool(
            toolUse.name,
            toolUse.input as ToolInput,
            {
              baseDir,
              baseBranch,
            },
          );

          // Handle finalize_decision
          if (toolUse.name === 'finalize_decision') {
            if (!isQuietMode) {
              try {
                const parsed = JSON.parse(toolResult);
                log(
                  `📝 Agent decision: confidence=${parsed.confidence}%, risk=${
                    parsed.risk_level
                  }, tags=${parsed.selected_tags?.length || 0}`,
                );
              } catch {
                // Ignore parse errors in logging
              }
            }

            const analysis = parseAgentDecision(toolResult);
            if (analysis) {
              // Process analysis using mode-specific logic
              const processedAnalysis = await modeConfig.processAnalysis(
                analysis,
                baseDir,
                log,
              );

              log(`✅ Analysis complete!`);
              return processedAnalysis;
            }

            log('⚠️ Failed to parse finalize_decision');
            return modeConfig.createConservativeResult();
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
      const analysis = parseAgentDecision(textContent.text);

      if (analysis) {
        // Process analysis using mode-specific logic
        const processedAnalysis = await modeConfig.processAnalysis(
          analysis,
          baseDir,
          log,
        );

        log(`✅ Analysis complete!`);
        return processedAnalysis;
      }
    }

    break;
  }

  log('⚠️ Using fallback analysis');
  return modeConfig.createConservativeResult();
}
