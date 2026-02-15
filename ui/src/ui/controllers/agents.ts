import type { GatewayBrowserClient } from "../gateway.ts";
import type { AgentsListResult, AgentIdentityResult } from "../types.ts";
import { loadAgentIdentity } from "./agent-identity.ts";

export type AgentsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  agentsLoading: boolean;
  agentsError: string | null;
  agentsList: AgentsListResult | null;
  agentsSelectedId: string | null;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  agentIdentityById: Record<string, AgentIdentityResult>;
};

export async function loadAgents(state: AgentsState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.agentsLoading) {
    return;
  }
  state.agentsLoading = true;
  state.agentsError = null;
  try {
    const res = await state.client.request<AgentsListResult>("agents.list", {});
    if (res) {
      state.agentsList = res;
      const selected = state.agentsSelectedId;
      const known = res.agents.some((entry) => entry.id === selected);
      if (!selected || !known) {
        state.agentsSelectedId = res.defaultId ?? res.agents[0]?.id ?? null;
      }
    }
  } catch (err) {
    state.agentsError = String(err);
  } finally {
    state.agentsLoading = false;
  }
}

export async function deleteAgent(state: AgentsState, agentId: string, deleteFiles = true) {
  if (!state.client || !state.connected) {
    return;
  }
  state.agentsLoading = true;
  state.agentsError = null;
  try {
    const res = await state.client.request<{ ok: boolean }>("agents.delete", {
      agentId,
      deleteFiles,
    });
    if (res?.ok) {
      if (state.agentsSelectedId === agentId) {
        state.agentsSelectedId = null;
      }
      await loadAgents(state);
    }
  } catch (err) {
    state.agentsError = String(err);
  } finally {
    state.agentsLoading = false;
  }
}

export async function updateAgent(
  state: AgentsState,
  params: {
    agentId: string;
    name?: string;
    avatar?: string;
    emoji?: string;
    model?: string;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  state.agentsLoading = true;
  state.agentsError = null;
  try {
    const res = await state.client.request<{ ok: boolean }>("agents.update", params);
    if (res?.ok) {
      await loadAgents(state);
      await loadAgentIdentity(state, params.agentId, true);
    }
  } catch (err) {
    state.agentsError = String(err);
    throw err;
  } finally {
    state.agentsLoading = false;
  }
}

export async function createAgent(
  state: AgentsState,
  params: {
    name: string;
    workspace?: string;
    emoji?: string;
    avatar?: string;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  state.agentsLoading = true;
  state.agentsError = null;
  try {
    const res = await state.client.request<{ ok: boolean; agentId: string }>(
      "agents.create",
      params,
    );
    if (res?.ok) {
      if (res.agentId) {
        state.agentsSelectedId = res.agentId;
        await loadAgents(state);
        await loadAgentIdentity(state, res.agentId, true);
      } else {
        await loadAgents(state);
      }
    }
  } catch (err) {
    state.agentsError = String(err);
    throw err;
  } finally {
    state.agentsLoading = false;
  }
}
