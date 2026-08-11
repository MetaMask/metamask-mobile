// Inbound message dispatcher. Modules register typed handlers for the message
// types they own; the dispatcher routes incoming messages by `type`.
//
// Mirrors legacy chartLogic.js `handleMessage` (lines ~341-401) but inverts
// control: instead of a hard-coded switch, modules subscribe via
// registerHandler. This lets Phase 2/3/5/6 add message types without editing
// this file.
//
// Phase 1 routes SET_THEME_COLORS via widget/theme.ts.

import { reportErrorToRN } from '../core/bridge';
import type { InboundMessage, InboundMessageType } from './contract';

type AnyHandler = (payload: unknown) => void;

const handlers = new Map<string, AnyHandler>();

/**
 * Register a handler for a single inbound message type. Subsequent calls
 * with the same type replace the previous handler (intentional — there's
 * one owner per message type by convention).
 */
export function registerHandler<T extends InboundMessageType>(
  type: T,
  handler: (payload: Extract<InboundMessage, { type: T }>['payload']) => void,
): void {
  handlers.set(type, handler as AnyHandler);
}

/**
 * Dispatches an incoming message to the registered handler. Unknown types
 * are silently dropped — future phases will add their handlers; the
 * dispatcher doesn't need to know what's coming.
 *
 * Errors inside a handler are forwarded to RN via ERROR.
 */
export function dispatchInboundMessage(message: InboundMessage): void {
  const handler = handlers.get(message.type);
  if (!handler) return;
  try {
    handler(message.payload as unknown);
  } catch (error) {
    reportErrorToRN(error);
  }
}

/** Test-only: clear all registered handlers. */
export function __resetHandlersForTests(): void {
  handlers.clear();
}
