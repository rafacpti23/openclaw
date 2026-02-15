import { html } from "lit";
import type { GatewayHelloOk } from "../gateway.ts";
import type { UiSettings } from "../storage.ts";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import { icons } from "../icons.ts";
import { getTranslation, type Language } from "../locales.ts";
import { formatNextRun } from "../presenter.ts";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
  language: Language;
  showToken: boolean;
  onToggleShowToken: () => void;
};

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | {
        uptimeMs?: number;
        policy?: { tickIntervalMs?: number };
        authMode?: "none" | "token" | "password" | "trusted-proxy";
      }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationHuman(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs ? `${snapshot.policy.tickIntervalMs}ms` : "n/a";
  const authMode = snapshot?.authMode;
  const isTrustedProxy = authMode === "trusted-proxy";
  const authHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px">
          ${getTranslation(props.settings.language, "overview.auth_hint_auth_required", "This gateway requires auth. Add a token or password, then click Connect.")}
          <div style="margin-top: 6px">
            <span class="mono">openclaw dashboard --no-open</span> → open the Control UI<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> → set token
          </div>
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              title="Control UI auth docs (opens in new tab)"
              >Docs: Control UI auth</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${getTranslation(props.settings.language, "overview.auth_failed", "Auth failed. Update the token or password in Control UI settings, then click Connect.")}
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            title="Control UI auth docs (opens in new tab)"
            >Docs: Control UI auth</a
          >
        </div>
      </div>
    `;
  })();
  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        This page is HTTP, so the browser blocks device identity. Use HTTPS (Tailscale Serve) or open
        <span class="mono">http://127.0.0.1:18789</span> on the gateway host.
        <div style="margin-top: 6px">
          If you must stay on HTTP, set
          <span class="mono">gateway.controlUi.allowInsecureAuth: true</span> (token-only).
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            title="Tailscale Serve docs (opens in new tab)"
            >Docs: Tailscale Serve</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            title="Insecure HTTP docs (opens in new tab)"
            >Docs: Insecure HTTP</a
          >
        </div>
      </div>
    `;
  })();

  return html`
    <section class="grid grid-cols-2">
      <div class="card card--gateway">
        <div class="card-title">${getTranslation(props.settings.language, "overview.gateway_access")}</div>
        <div class="card-sub">${getTranslation(props.settings.language, "overview.gateway_access_sub")}</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>${getTranslation(props.settings.language, "overview.websocket_url")}</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSettingsChange({ ...props.settings, gatewayUrl: v });
              }}
              placeholder="ws://100.x.y.z:18789"
            />
          </label>
          ${
            isTrustedProxy
              ? ""
              : html`
                <label class="field">
                  <span>${getTranslation(props.settings.language, "overview.gateway_token")}</span>
                  <div class="input-with-toggle">
                    <input
                      type=${props.showToken ? "text" : "password"}
                      .value=${props.settings.token}
                      @input=${(e: Event) => {
                        const v = (e.target as HTMLInputElement).value;
                        props.onSettingsChange({ ...props.settings, token: v });
                      }}
                      placeholder="OPENCLAW_GATEWAY_TOKEN"
                    />
                    <button class="toggle-btn" @click=${() => props.onToggleShowToken()} title="Toggle Visibility">
                       <span class="nav-item__icon">${props.showToken ? icons.eyeOff : icons.eye}</span>
                    </button>
                  </div>
                </label>
                <label class="field">
                  <span>${getTranslation(props.settings.language, "overview.password")}</span>
                  <input
                    type="password"
                    .value=${props.password}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onPasswordChange(v);
                    }}
                    placeholder="system or shared password"
                  />
                </label>
              `
          }
          <label class="field">
            <span>${getTranslation(props.settings.language, "overview.default_session_key")}</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSessionKeyChange(v);
              }}
            />
          </label>
        </div>
        <div class="row" style="margin-top: 24px;">
          <button class="btn btn--primary" @click=${() => props.onConnect()}>${getTranslation(props.settings.language, "overview.connect")}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${getTranslation(props.settings.language, "overview.refresh")}</button>
          <span class="muted" style="font-size: 11px;">${isTrustedProxy ? getTranslation(props.settings.language, "overview.auth_hint_trusted") : getTranslation(props.settings.language, "overview.auth_hint_connect")}</span>
        </div>
      </div>

      <div class="card card--snapshot">
        <div class="card-title">${getTranslation(props.settings.language, "overview.snapshot")}</div>
        <div class="card-sub">${getTranslation(props.settings.language, "overview.snapshot_sub")}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">${getTranslation(props.settings.language, "overview.status")}</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? getTranslation(props.settings.language, "overview.connected") : getTranslation(props.settings.language, "overview.disconnected")}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${getTranslation(props.settings.language, "overview.uptime")}</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${getTranslation(props.settings.language, "overview.tick_interval")}</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${getTranslation(props.settings.language, "overview.last_channels_refresh")}</div>
            <div class="stat-value">
              ${props.lastChannelsRefresh ? formatRelativeTimestamp(props.lastChannelsRefresh) : "n/a"}
            </div>
          </div>
        </div>
        ${
          props.lastError
            ? html`<div class="callout danger" style="margin-top: 14px;">
              <div>${props.lastError}</div>
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
            : html`
                <div class="callout" style="margin-top: 14px">
                  ${getTranslation(props.settings.language, "overview.channels_hint")}
                </div>
              `
        }
        <div class="row" style="margin-top: 24px;">
          <button class="btn btn--primary" @click=${() => props.onRefresh()}>${getTranslation(props.settings.language, "overview.refresh_snapshot") || "Refresh Snapshot"}</button>
          <span class="muted" style="font-size: 11px;">${getTranslation(props.settings.language, "overview.snapshot_hint") || "Last updated just now"}</span>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-3" style="margin-top: 18px;">
      <div class="card stat-card">
        <div class="stat-label">${getTranslation(props.settings.language, "overview.instances")}</div>
        <div class="stat-value">${props.presenceCount}</div>
        <div class="muted">${getTranslation(props.settings.language, "overview.instances_sub")}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">${getTranslation(props.settings.language, "overview.sessions")}</div>
        <div class="stat-value">${props.sessionsCount ?? "n/a"}</div>
        <div class="muted">${getTranslation(props.settings.language, "overview.sessions_sub")}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">${getTranslation(props.settings.language, "overview.cron")}</div>
        <div class="stat-value">
          ${props.cronEnabled == null ? "n/a" : props.cronEnabled ? getTranslation(props.settings.language, "overview.enabled") : getTranslation(props.settings.language, "overview.disabled")}
        </div>
        <div class="muted">${getTranslation(props.settings.language, "overview.cron_sub")} ${formatNextRun(props.cronNext)}</div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${getTranslation(props.settings.language, "overview.notes")}</div>
      <div class="card-sub">${getTranslation(props.settings.language, "overview.notes_sub")}</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div>
          <div class="note-title">${getTranslation(props.settings.language, "overview.tailscale_serve")}</div>
          <div class="muted">
            ${getTranslation(props.settings.language, "overview.tailscale_serve_sub")}
          </div>
        </div>
        <div>
          <div class="note-title">${getTranslation(props.settings.language, "overview.session_hygiene")}</div>
          <div class="muted">${getTranslation(props.settings.language, "overview.session_hygiene_sub")}</div>
        </div>
        <div>
          <div class="note-title">${getTranslation(props.settings.language, "overview.cron_reminders")}</div>
          <div class="muted">${getTranslation(props.settings.language, "overview.cron_reminders_sub")}</div>
        </div>
      </div>
    </section>
  `;
}
