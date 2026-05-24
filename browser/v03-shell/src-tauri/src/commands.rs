use serde::{Deserialize, Serialize};

const DAEMON_URL: &str = "http://127.0.0.1:40201";

// ── Payload types ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AgentPayload {
    pub url:          String,
    pub title:        String,
    pub full_text:    Option<String>,
    pub selection:    Option<String>,
    pub contracts:    Option<Vec<String>>,
    pub has_ethereum: Option<bool>,
    pub has_solana:   Option<bool>,
    pub is_known_dapp: Option<bool>,
    pub chain:        Option<String>,
    pub wallet_address: Option<String>,
    pub mode:         String,
    pub prompt:       Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentResponse {
    pub ok:     bool,
    pub answer: Option<String>,
    pub mode:   Option<String>,
    pub error:  Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub ok:              bool,
    pub version:         Option<String>,
    pub brain:           Option<String>,
    pub openclaw_online: Option<bool>,
    pub ollama_online:   Option<bool>,
}

// ── Tauri commands ─────────────────────────────────────────────────────────────

/// Route a page context payload to the Unykorn daemon and return the agent answer.
#[tauri::command]
pub async fn call_agent(payload: AgentPayload) -> Result<AgentResponse, String> {
    let client = reqwest::Client::new();

    // Build the JSON body using serde_json
    let body = serde_json::json!({
        "url":           payload.url,
        "title":         payload.title,
        "fullText":      payload.full_text.unwrap_or_default(),
        "selection":     payload.selection.unwrap_or_default(),
        "contracts":     payload.contracts.unwrap_or_default(),
        "hasEthereum":   payload.has_ethereum.unwrap_or(false),
        "hasSolana":     payload.has_solana.unwrap_or(false),
        "isKnownDapp":   payload.is_known_dapp.unwrap_or(false),
        "chain":         payload.chain,
        "walletAddress": payload.wallet_address,
        "mode":          payload.mode,
        "prompt":        payload.prompt.unwrap_or_default(),
    });

    let res = client
        .post(format!("{}/agent", DAEMON_URL))
        .json(&body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Daemon unreachable: {}", e))?;

    let response: AgentResponse = res
        .json()
        .await
        .map_err(|e| format!("Response parse error: {}", e))?;

    Ok(response)
}

/// Probe daemon health — returns version, brain, and dependency status.
#[tauri::command]
pub async fn get_daemon_health() -> Result<HealthResponse, String> {
    let client = reqwest::Client::new();

    let res = client
        .get(format!("{}/health", DAEMON_URL))
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
        .map_err(|e| format!("Daemon unreachable: {}", e))?;

    let health: HealthResponse = res
        .json()
        .await
        .map_err(|e| format!("Response parse error: {}", e))?;

    Ok(health)
}

/// Open a URL in the system default browser (for external links from new-tab).
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}
