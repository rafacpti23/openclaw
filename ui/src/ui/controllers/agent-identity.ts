import type { GatewayBrowserClient } from "../gateway.ts";
import type { AgentIdentityResult } from "../types.ts";

export type AgentIdentityState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  agentIdentityById: Record<string, AgentIdentityResult>;
};

export async function loadAgentIdentity(state: AgentIdentityState, agentId: string, force = false) {
  if (!state.client || !state.connected || state.agentIdentityLoading) {
    return;
  }
  if (!force && state.agentIdentityById[agentId]) {
    return;
  }
  state.agentIdentityLoading = true;
  state.agentIdentityError = null;
  try {
    const res = await state.client.request<AgentIdentityResult | null>("agent.identity.get", {
      agentId,
    });
    if (res) {
      state.agentIdentityById = { ...state.agentIdentityById, [agentId]: res };
    }
  } catch (err) {
    state.agentIdentityError = String(err);
  } finally {
    state.agentIdentityLoading = false;
  }
}

export async function loadAgentIdentities(
  state: AgentIdentityState,
  agentIds: string[],
  force = false,
) {
  if (!state.client || !state.connected || state.agentIdentityLoading) {
    return;
  }
  const missing = force ? agentIds : agentIds.filter((id) => !state.agentIdentityById[id]);
  if (missing.length === 0) {
    return;
  }
  state.agentIdentityLoading = true;
  state.agentIdentityError = null;
  try {
    for (const agentId of missing) {
      const res = await state.client.request<AgentIdentityResult | null>("agent.identity.get", {
        agentId,
      });
      if (res) {
        state.agentIdentityById = { ...state.agentIdentityById, [agentId]: res };
      }
    }
  } catch (err) {
    state.agentIdentityError = String(err);
  } finally {
    state.agentIdentityLoading = false;
  }
}
