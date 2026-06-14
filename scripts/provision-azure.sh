#!/usr/bin/env bash
# ============================================================================
# DecisionDNA — Azure provisioning (Phase 1).
#
# Prereqs (Phase 0): an Azure subscription, Azure CLI + Bicep installed, and:
#     az login
#
# TWO MODES:
#   1) Cheap demo (RECOMMENDED for the recording) — Azure OpenAI only (~$2):
#          ./scripts/provision-azure.sh --openai-only
#      Gives real ~90% match numbers. AI Search / Cosmos / App Service stay
#      mocked locally (the app needs only Azure OpenAI for live numbers).
#
#   2) Full stack (production fidelity, pricier) — whole bicep/main.bicep:
#          ./scripts/provision-azure.sh
#      Deploys Azure OpenAI + AI Search (Std ~$245/mo) + Cosmos + Key Vault +
#      App Service (P1v3 ~$90/mo). Delete the RG the same day.
#
# Either mode writes a ready .env (MOCK_LLM=0) and runs `npm run test:azure`.
#
# Overrides (env): RG, LOCATION, PREFIX, CHAT_MODEL, CHAT_VERSION, EMBED_MODEL.
# Tear down:  az group delete -n "$RG"
# ============================================================================
set -euo pipefail

OPENAI_ONLY=0
[ "${1:-}" = "--openai-only" ] && OPENAI_ONLY=1
[ "${OPENAI_ONLY_ENV:-0}" = "1" ] && OPENAI_ONLY=1

RG="${RG:-decisiondna-rg}"
LOCATION="${LOCATION:-eastus2}"
PREFIX="${PREFIX:-decisiondna}"
CHAT_MODEL="${CHAT_MODEL:-gpt-5}"
CHAT_VERSION="${CHAT_VERSION:-2025-08-07}"
EMBED_MODEL="${EMBED_MODEL:-text-embedding-3-large}"
DEPLOYMENT="decisiondna-$(date +%Y%m%d%H%M%S)"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "\033[32m✓ %s\033[0m\n" "$1"; }
warn() { printf "\033[33m! %s\033[0m\n" "$1"; }
die()  { printf "\033[31m✗ %s\033[0m\n" "$1"; exit 1; }

# ---- preflight -------------------------------------------------------------
command -v az >/dev/null || die "Azure CLI not found. Install it, then 'az login'."
az account show >/dev/null 2>&1 || die "Not logged in. Run: az login"
SUB_NAME="$(az account show --query name -o tsv)"

bold "Provisioning DecisionDNA → subscription: $SUB_NAME"
echo "  Mode           : $([ $OPENAI_ONLY = 1 ] && echo 'OpenAI-only (cheap demo)' || echo 'Full stack')"
echo "  Resource group : $RG ($LOCATION)"
echo "  Chat model     : $CHAT_MODEL ($CHAT_VERSION)"
echo "  Embedding model: $EMBED_MODEL"
echo

OPERATOR_ID="$(az ad signed-in-user show --query id -o tsv 2>/dev/null || echo '')"

bold "Checking Azure OpenAI model availability in $LOCATION…"
if az cognitiveservices model list -l "$LOCATION" --query "[].model.name" -o tsv 2>/dev/null | grep -qx "$CHAT_MODEL"; then
  ok "$CHAT_MODEL available in $LOCATION"
else
  warn "$CHAT_MODEL not found in $LOCATION. If deploy fails, retry e.g.: CHAT_MODEL=gpt-4o CHAT_VERSION=2024-11-20 $0 ${1:-}"
fi

bold "Creating resource group…"
az group create -n "$RG" -l "$LOCATION" -o none
ok "Resource group ready"

SEARCH_ENDPOINT=""; COSMOS_ENDPOINT=""; KV_NAME=""; WEBAPP_HOST=""

if [ $OPENAI_ONLY = 1 ]; then
  # -------- OpenAI-only path (CLI, cheap) -----------------------------------
  OPENAI_NAME="${PREFIX}openai$(date +%s | tail -c 6)"
  bold "Creating Azure OpenAI account ($OPENAI_NAME)…"
  az cognitiveservices account create -n "$OPENAI_NAME" -g "$RG" -l "$LOCATION" \
    --kind OpenAI --sku S0 --custom-domain "$OPENAI_NAME" --yes -o none
  ok "Azure OpenAI account created"

  bold "Deploying models…"
  az cognitiveservices account deployment create -n "$OPENAI_NAME" -g "$RG" \
    --deployment-name "$CHAT_MODEL" --model-name "$CHAT_MODEL" --model-version "$CHAT_VERSION" \
    --model-format OpenAI --sku-name GlobalStandard --sku-capacity 50 -o none \
    || warn "Chat model deploy failed — retry with a supported CHAT_MODEL/CHAT_VERSION/region."
  az cognitiveservices account deployment create -n "$OPENAI_NAME" -g "$RG" \
    --deployment-name "$EMBED_MODEL" --model-name "$EMBED_MODEL" --model-version "1" \
    --model-format OpenAI --sku-name Standard --sku-capacity 120 -o none \
    || warn "Embedding model deploy failed — check availability in $LOCATION."
  ok "Model deployments requested"

  OPENAI_ENDPOINT="$(az cognitiveservices account show -n "$OPENAI_NAME" -g "$RG" --query properties.endpoint -o tsv)"
  CHAT_DEPLOYMENT="$CHAT_MODEL"
  EMBED_DEPLOYMENT="$EMBED_MODEL"
else
  # -------- Full bicep path -------------------------------------------------
  bold "Deploying full infrastructure (~5–10 min)…"
  az deployment group create \
    --resource-group "$RG" --name "$DEPLOYMENT" \
    --template-file bicep/main.bicep --parameters bicep/parameters.json \
    --parameters namePrefix="$PREFIX" location="$LOCATION" openAiLocation="$LOCATION" \
                 chatModelName="$CHAT_MODEL" chatModelVersion="$CHAT_VERSION" \
                 embeddingModelName="$EMBED_MODEL" operatorObjectId="$OPERATOR_ID" -o none
  ok "Deployment complete"
  get() { az deployment group show -g "$RG" -n "$DEPLOYMENT" --query "properties.outputs.$1.value" -o tsv; }
  OPENAI_NAME="$(get openAiName)"
  OPENAI_ENDPOINT="$(get openAiEndpoint)"
  CHAT_DEPLOYMENT="$(get chatDeploymentName)"
  EMBED_DEPLOYMENT="$(get embeddingDeploymentName)"
  SEARCH_ENDPOINT="$(get searchEndpoint)"
  COSMOS_ENDPOINT="$(get cosmosEndpoint)"
  KV_NAME="$(get keyVaultName)"
  WEBAPP_HOST="$(get webAppDefaultHostName)"
fi

# ---- fetch key + write .env (shared) ---------------------------------------
OPENAI_KEY="$(az cognitiveservices account keys list -n "$OPENAI_NAME" -g "$RG" --query key1 -o tsv)"

bold "Writing .env (MOCK_LLM=0)…"
{
  echo "# Generated by scripts/provision-azure.sh on $(date)"
  echo "MOCK_LLM=0"
  echo "AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT"
  echo "AZURE_OPENAI_API_KEY=$OPENAI_KEY"
  echo "AZURE_OPENAI_API_VERSION=2024-10-21"
  echo "AZURE_OPENAI_CHAT_DEPLOYMENT=$CHAT_DEPLOYMENT"
  echo "AZURE_OPENAI_EMBEDDING_DEPLOYMENT=$EMBED_DEPLOYMENT"
  echo "DECISIONDNA_CONFIDENCE_THRESHOLD=0.6"
  [ -n "$SEARCH_ENDPOINT" ] && echo "AZURE_SEARCH_ENDPOINT=$SEARCH_ENDPOINT"
  [ -n "$COSMOS_ENDPOINT" ] && echo "AZURE_COSMOS_ENDPOINT=$COSMOS_ENDPOINT"
  [ -n "$KV_NAME" ] && echo "AZURE_KEY_VAULT_NAME=$KV_NAME"
} > .env
ok ".env written"

bold "Verifying Azure OpenAI connectivity…"
set -a; . ./.env; set +a
if npm run -s test:azure; then
  ok "Azure OpenAI reachable — DecisionDNA is now in LIVE mode."
else
  warn "Connectivity check failed — model deployments can take a few minutes; retry: npm run test:azure"
fi

echo
bold "Done."
echo "  OpenAI endpoint : $OPENAI_ENDPOINT"
[ -n "$WEBAPP_HOST" ] && echo "  Web App host    : https://$WEBAPP_HOST"
echo "  Run locally     : npm run dev    (now uses real Azure OpenAI)"
echo "  Tear down       : az group delete -n $RG"
