import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { streamAgentChunks, type MastraChunk } from '../services/chatStream';
import type { ChatMessage } from '../types';

const AGENT_ID = 'walletAgent';

const toCaipChainId = (hexChainId?: string): string | undefined => {
  if (!hexChainId) return undefined;
  const numeric = parseInt(hexChainId, 16);
  return Number.isNaN(numeric) ? undefined : `eip155:${numeric}`;
};

export interface UseAgentChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  cancel: () => void;
  isRunning: boolean;
  error?: string;
}

/**
 * Read-only chat with the wallet agent. Mirrors @mastra/react's useChat
 * shape (that package is react-dom-bound, so the hook is hand-rolled here).
 *
 * Thread id is per-mount; `resource` is the MetaMask profileId so server-side
 * auth can later verify the same value the client already sends (see
 * agentic-harness docs/roadmap.md — auth & tenant isolation).
 */
export const useAgentChat = (): UseAgentChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const threadIdRef = useRef<string>(uuidv4());
  const abortRef = useRef<AbortController | null>(null);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const chainIdHex = useSelector(selectEvmChainId);

  useEffect(() => () => abortRef.current?.abort(), []);

  const applyChunk = useCallback((assistantId: string, chunk: MastraChunk) => {
    setMessages((prev) =>
      prev.map((message): ChatMessage => {
        if (message.id !== assistantId) return message;
        const payload = chunk.payload ?? {};
        switch (chunk.type) {
          case 'text-delta':
            return {
              ...message,
              status: 'streaming',
              text: message.text + String(payload.text ?? ''),
            };
          case 'tool-call':
            return {
              ...message,
              status: 'streaming',
              toolCalls: [
                ...message.toolCalls,
                {
                  toolCallId: String(payload.toolCallId ?? uuidv4()),
                  toolName: String(payload.toolName ?? 'tool'),
                  status: 'running',
                },
              ],
            };
          case 'tool-result':
          case 'tool-error':
            return {
              ...message,
              toolCalls: message.toolCalls.map((toolCall) =>
                toolCall.toolCallId === String(payload.toolCallId)
                  ? {
                      ...toolCall,
                      status: chunk.type === 'tool-result' ? 'done' : 'error',
                    }
                  : toolCall,
              ),
            };
          case 'finish':
            return message.status === 'error'
              ? message
              : { ...message, status: 'done' };
          case 'error':
          case 'abort':
          case 'tripwire':
            return {
              ...message,
              status: 'error',
              text: message.text || 'Something went wrong.',
            };
          default:
            return message;
        }
      }),
    );
  }, []);

  const resolveResourceId = useCallback(async (): Promise<string> => {
    try {
      const profile =
        await Engine.context.AuthenticationController.getSessionProfile();
      return profile.profileId;
    } catch {
      // Not signed in (e.g. basic functionality off) — fall back to address.
      return selectedAccount?.address ?? 'anonymous';
    }
  }, [selectedAccount?.address]);

  const sendMessage = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || isRunning) return;
      const assistantId = uuidv4();
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'user', text, toolCalls: [], status: 'done' },
        {
          id: assistantId,
          role: 'assistant',
          text: '',
          toolCalls: [],
          status: 'pending',
        },
      ]);
      setIsRunning(true);
      setError(undefined);
      const controller = new AbortController();
      abortRef.current = controller;
      const run = async () => {
        const resourceId = await resolveResourceId();
        await streamAgentChunks({
          baseUrl: AppConstants.CHAT_API_URL,
          agentId: AGENT_ID,
          message: text,
          threadId: threadIdRef.current,
          resourceId,
          requestContext: {
            selectedAddress: selectedAccount?.address,
            selectedChainId: toCaipChainId(chainIdHex),
          },
          signal: controller.signal,
          onChunk: (chunk) => applyChunk(assistantId, chunk),
        });
        // Defensive: mark done even if no finish chunk arrived.
        applyChunk(assistantId, { type: 'finish' });
      };
      run()
        .catch((streamError: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
          );
          applyChunk(assistantId, { type: 'error' });
        })
        .finally(() => {
          setIsRunning(false);
          abortRef.current = null;
        });
    },
    [
      applyChunk,
      chainIdHex,
      isRunning,
      resolveResourceId,
      selectedAccount?.address,
    ],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, sendMessage, cancel, isRunning, error };
};
