#!/usr/bin/env bash
# ============================================================================
# DecisionDNA — Microsoft 365 + Entra ID setup
# ----------------------------------------------------------------------------
# Creates the Entra ID app registration (delegated Graph permissions) used by
# the DecisionDNA agent + Copilot Studio connector, then seeds the SharePoint
# document library with the synthetic decision corpus.
#
# Prereqs:
#   - Azure CLI  >= 2.60   (az --version)
#   - jq         >= 1.6
#   - An M365 E5 developer tenant (see "STEP 0" manual checklist below)
#   - You are signed in:  az login --allow-no-subscriptions --tenant <tenant>
#
# Usage:
#   chmod +x scripts/setup-m365.sh
#   export DDNA_SHAREPOINT_HOSTNAME="contoso.sharepoint.com"
#   export DDNA_SHAREPOINT_SITE="DecisionDNA"          # site path under /sites/
#   ./scripts/setup-m365.sh
#
# Re-running is safe: existing app registration is reused by display name.
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
APP_DISPLAY_NAME="${DDNA_APP_NAME:-DecisionDNA-Agent}"
SIGN_IN_AUDIENCE="AzureADMyOrg"            # single-tenant dev sandbox
REDIRECT_URIS=(
  "http://localhost:3000/auth/callback"   # Next.js demo UI
  "https://global.consent.azure-apim.net/redirect"  # Copilot Studio / Power Platform connector
)
CORPUS_FILE="${DDNA_CORPUS_FILE:-data/synthetic-corpus-sample.json}"
DOC_LIBRARY="${DDNA_DOC_LIBRARY:-Shared Documents}"   # default SharePoint library
GRAPH_APP_ID="00000003-0000-0000-c000-000000000000"  # Microsoft Graph

# Microsoft Graph DELEGATED permission (oauth2PermissionScopes) GUIDs.
# type=Scope => delegated.  Verify with:
#   az ad sp show --id 00000003-0000-0000-c000-000000000000 \
#     --query "oauth2PermissionScopes[?value=='Mail.Read'].id"
SCOPE_MAIL_READ="570282fd-fa5c-430d-a7fd-fc8dc98a9dca"        # Mail.Read
SCOPE_CALENDARS_READ="465a38f9-76ea-45b9-9f34-9e8b0d4b0b42"  # Calendars.Read
SCOPE_CHAT_READ="f501c180-9344-439a-bca0-6cbf209fd270"       # Chat.Read
SCOPE_USER_READ_ALL="a154be20-db9c-4678-8ab7-66f6cc099a59"   # User.Read.All (delegated)

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
log()  { printf '\033[1;36m[ddna]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

command -v az >/dev/null || die "Azure CLI not found. Install: https://aka.ms/azcli"
command -v jq >/dev/null || die "jq not found. Install: https://stedolan.github.io/jq/"

cat <<'BANNER'
============================================================================
 STEP 0 — M365 E5 developer tenant (MANUAL, one-time)
----------------------------------------------------------------------------
 1. Go to https://developer.microsoft.com/microsoft-365/dev-program
 2. Join the Microsoft 365 Developer Program (free) and click
    "Set up E5 subscription"  ->  Instant sandbox.
 3. Record the tenant: <yourtenant>.onmicrosoft.com  and admin credentials.
 4. Enable the sandbox content pack (sample users, mail, Teams, SharePoint).
 5. Sign the CLI into THAT tenant before continuing:
       az login --allow-no-subscriptions --tenant <yourtenant>.onmicrosoft.com
 6. Create the target SharePoint site (Team site) named per DDNA_SHAREPOINT_SITE,
    e.g. https://<yourtenant>.sharepoint.com/sites/DecisionDNA
============================================================================
BANNER

read -r -p "Tenant is provisioned and you are 'az login'-ed into it. Continue? [y/N] " ok
[[ "${ok:-N}" =~ ^[Yy]$ ]] || die "Aborted by user."

TENANT_ID="$(az account show --query tenantId -o tsv)"
log "Operating in tenant: ${TENANT_ID}"

# ----------------------------------------------------------------------------
# STEP 1 — App registration (idempotent by display name)
# ----------------------------------------------------------------------------
log "Ensuring app registration '${APP_DISPLAY_NAME}'..."

APP_ID="$(az ad app list --display-name "${APP_DISPLAY_NAME}" \
          --query "[0].appId" -o tsv 2>/dev/null || true)"

if [[ -z "${APP_ID}" || "${APP_ID}" == "null" ]]; then
  log "Creating new app registration..."
  APP_ID="$(az ad app create \
    --display-name "${APP_DISPLAY_NAME}" \
    --sign-in-audience "${SIGN_IN_AUDIENCE}" \
    --web-redirect-uris "${REDIRECT_URIS[@]}" \
    --enable-id-token-issuance true \
    --query appId -o tsv)"
  log "Created appId: ${APP_ID}"
else
  log "Reusing existing appId: ${APP_ID}"
  az ad app update --id "${APP_ID}" \
    --web-redirect-uris "${REDIRECT_URIS[@]}" >/dev/null
fi

OBJECT_ID="$(az ad app show --id "${APP_ID}" --query id -o tsv)"

# ----------------------------------------------------------------------------
# STEP 2 — Delegated Microsoft Graph permissions
#   Mail.Read, Calendars.Read, Chat.Read, User.Read.All
# ----------------------------------------------------------------------------
log "Applying delegated Graph permissions (Mail.Read, Calendars.Read, Chat.Read, User.Read.All)..."

# Build a single requiredResourceAccess block (replaces any prior Graph block).
REQUIRED_ACCESS="$(jq -n \
  --arg graph "${GRAPH_APP_ID}" \
  --arg s1 "${SCOPE_MAIL_READ}" \
  --arg s2 "${SCOPE_CALENDARS_READ}" \
  --arg s3 "${SCOPE_CHAT_READ}" \
  --arg s4 "${SCOPE_USER_READ_ALL}" \
  '[{
      resourceAppId: $graph,
      resourceAccess: [
        { id: $s1, type: "Scope" },
        { id: $s2, type: "Scope" },
        { id: $s3, type: "Scope" },
        { id: $s4, type: "Scope" }
      ]
   }]')"

az ad app update --id "${APP_ID}" \
  --required-resource-accesses "${REQUIRED_ACCESS}" >/dev/null
log "Delegated permissions set on app manifest."

# ----------------------------------------------------------------------------
# STEP 3 — Service principal (enterprise app) for the Copilot Studio connector
# ----------------------------------------------------------------------------
log "Ensuring service principal for '${APP_DISPLAY_NAME}'..."
SP_ID="$(az ad sp list --filter "appId eq '${APP_ID}'" --query "[0].id" -o tsv 2>/dev/null || true)"
if [[ -z "${SP_ID}" || "${SP_ID}" == "null" ]]; then
  SP_ID="$(az ad sp create --id "${APP_ID}" --query id -o tsv)"
  log "Created service principal: ${SP_ID}"
else
  log "Reusing service principal: ${SP_ID}"
fi

# Client secret for the connector (store it in Key Vault — see note below).
log "Generating a client secret for the Copilot Studio connector (valid 12 months)..."
CLIENT_SECRET="$(az ad app credential reset \
  --id "${APP_ID}" \
  --display-name "copilot-studio-connector" \
  --years 1 \
  --query password -o tsv)"

# ----------------------------------------------------------------------------
# STEP 4 — Admin consent for delegated permissions
#   Requires a Global Admin / Privileged Role Admin in the dev tenant.
# ----------------------------------------------------------------------------
log "Granting admin consent for delegated Graph permissions..."
if az ad app permission admin-consent --id "${APP_ID}" 2>/dev/null; then
  log "Admin consent granted."
else
  warn "Could not auto-grant consent (insufficient privileges or eventual consistency)."
  warn "Grant it manually in the Entra admin center:"
  warn "  Entra ID > App registrations > ${APP_DISPLAY_NAME} > API permissions > 'Grant admin consent'"
  warn "Or via Graph Explorer (https://developer.microsoft.com/graph/graph-explorer):"
  warn "  Sign in as admin, open API permissions, and consent to:"
  warn "  Mail.Read, Calendars.Read, Chat.Read, User.Read.All"
fi

# ----------------------------------------------------------------------------
# STEP 5 — Seed SharePoint document library with the synthetic corpus
# ----------------------------------------------------------------------------
: "${DDNA_SHAREPOINT_HOSTNAME:?Set DDNA_SHAREPOINT_HOSTNAME, e.g. contoso.sharepoint.com}"
: "${DDNA_SHAREPOINT_SITE:?Set DDNA_SHAREPOINT_SITE, e.g. DecisionDNA}"
[[ -f "${CORPUS_FILE}" ]] || die "Corpus file not found: ${CORPUS_FILE}"

log "Seeding SharePoint library '${DOC_LIBRARY}' on ${DDNA_SHAREPOINT_HOSTNAME}/sites/${DDNA_SHAREPOINT_SITE}..."

# Acquire a Graph token (uses your interactive az session).
GRAPH_TOKEN="$(az account get-access-token \
  --resource-type ms-graph \
  --query accessToken -o tsv)"

# Resolve the SharePoint site id.
SITE_ID="$(curl -fsS \
  -H "Authorization: Bearer ${GRAPH_TOKEN}" \
  "https://graph.microsoft.com/v1.0/sites/${DDNA_SHAREPOINT_HOSTNAME}:/sites/${DDNA_SHAREPOINT_SITE}" \
  | jq -r '.id')"
[[ -n "${SITE_ID}" && "${SITE_ID}" != "null" ]] || die "Could not resolve SharePoint site id. Check hostname/site path."
log "Site id: ${SITE_ID}"

# Split the corpus into one file per decision record and upload each into a
# DecisionDNA/ folder inside the library's drive root.
RECORD_COUNT="$(jq '.records | length' "${CORPUS_FILE}")"
log "Uploading ${RECORD_COUNT} decision records..."

for i in $(seq 0 $((RECORD_COUNT - 1))); do
  REC_ID="$(jq -r ".records[$i].id" "${CORPUS_FILE}")"
  TMP="$(mktemp)"
  jq ".records[$i]" "${CORPUS_FILE}" > "${TMP}"

  UPLOAD_PATH="DecisionDNA/${REC_ID}.json"
  HTTP_CODE="$(curl -fsS -o /dev/null -w '%{http_code}' \
    -X PUT \
    -H "Authorization: Bearer ${GRAPH_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary "@${TMP}" \
    "https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root:/${UPLOAD_PATH}:/content")" || HTTP_CODE="000"
  rm -f "${TMP}"

  if [[ "${HTTP_CODE}" == "200" || "${HTTP_CODE}" == "201" ]]; then
    log "  ✓ ${UPLOAD_PATH}"
  else
    warn "  ✗ ${UPLOAD_PATH} (HTTP ${HTTP_CODE})"
  fi
done

# ----------------------------------------------------------------------------
# STEP 6 — Persist connector credentials to Key Vault (if KV name is provided)
# ----------------------------------------------------------------------------
if [[ -n "${DDNA_KEYVAULT_NAME:-}" ]]; then
  log "Storing app credentials in Key Vault '${DDNA_KEYVAULT_NAME}'..."
  az keyvault secret set --vault-name "${DDNA_KEYVAULT_NAME}" \
    --name "Entra-ClientId" --value "${APP_ID}" >/dev/null
  az keyvault secret set --vault-name "${DDNA_KEYVAULT_NAME}" \
    --name "Entra-TenantId" --value "${TENANT_ID}" >/dev/null
  az keyvault secret set --vault-name "${DDNA_KEYVAULT_NAME}" \
    --name "Entra-ClientSecret" --value "${CLIENT_SECRET}" >/dev/null
  log "Stored Entra-ClientId / Entra-TenantId / Entra-ClientSecret."
else
  warn "DDNA_KEYVAULT_NAME not set — printing the connector secret ONCE (store it now):"
  echo "------------------------------------------------------------"
  echo " TENANT_ID     : ${TENANT_ID}"
  echo " CLIENT_ID     : ${APP_ID}"
  echo " CLIENT_SECRET : ${CLIENT_SECRET}"
  echo "------------------------------------------------------------"
fi

# ----------------------------------------------------------------------------
# Done
# ----------------------------------------------------------------------------
cat <<EOF

============================================================================
 ✅  M365 setup complete

   App registration : ${APP_DISPLAY_NAME}  (${APP_ID})
   Service principal: ${SP_ID}
   Delegated scopes : Mail.Read, Calendars.Read, Chat.Read, User.Read.All
   SharePoint corpus: ${RECORD_COUNT} records -> /DecisionDNA/*.json

 Next:
   1. In Copilot Studio, create a custom connector using CLIENT_ID + secret
      and the redirect URI https://global.consent.azure-apim.net/redirect
   2. Add the connector as a tool/action in your DecisionDNA agent topic.
   3. Verify delegated consent in Graph Explorer by calling:
        GET https://graph.microsoft.com/v1.0/me/messages?\$top=1
        GET https://graph.microsoft.com/v1.0/me/events?\$top=1
============================================================================
EOF
