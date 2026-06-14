// ============================================================================
// DecisionDNA — Azure Infrastructure
// Organizational Decision Intelligence Platform
// ----------------------------------------------------------------------------
// Provisions the full Microsoft AI stack used by DecisionDNA:
//   - Azure OpenAI            (gpt-5 + text-embedding-3-large deployments)
//   - Azure AI Search         (standard tier, vector index capable)
//   - Azure Cosmos DB         (serverless, decision-memory container)
//   - Azure Key Vault         (RBAC, secrets for every service connection)
//   - App Service Plan + Web  (Linux, Node.js 20 runtime)
//
// NOTE on Entra ID: app registrations live in Microsoft Graph, not ARM.
// They are created by scripts/setup-m365.sh (az ad app create). Keeping them
// out of this template guarantees `az deployment group create` runs cleanly
// with no Graph-extension prerequisites. The web app is granted a system
// managed identity here and is given Key Vault RBAC so it can read secrets.
//
// Deploy:
//   az group create -n rg-decisiondna -l eastus2
//   az deployment group create -g rg-decisiondna \
//     -f bicep/main.bicep -p bicep/parameters.json
// ============================================================================

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Short name prefix used to derive all resource names. 3-11 lowercase alphanumerics.')
@minLength(3)
@maxLength(11)
param namePrefix string = 'decisiondna'

@description('Primary Azure region for all regional resources.')
param location string = resourceGroup().location

@description('Region for the Azure OpenAI account. gpt-5 + text-embedding-3-large must both be available here. eastus2 / swedencentral are common choices.')
param openAiLocation string = 'eastus2'

@description('Deterministic suffix to keep globally-unique names stable across redeploys. Defaults to a hash of the resource group id.')
param uniqueSuffix string = substring(uniqueString(resourceGroup().id), 0, 6)

@description('Object id (principal id) of the developer/operator who should get Key Vault Secrets Officer + AI access for local testing. Leave empty to skip.')
param operatorObjectId string = ''

// --- Azure OpenAI model configuration (parameterised so you can pin versions) ---

@description('Chat model name to deploy on Azure OpenAI.')
param chatModelName string = 'gpt-5'

@description('Chat model version. Set to a version available in openAiLocation (check: az cognitiveservices model list).')
param chatModelVersion string = '2025-08-07'

@description('Chat deployment capacity in thousands of tokens-per-minute (TPM) units.')
param chatCapacity int = 50

@description('Embedding model name to deploy on Azure OpenAI.')
param embeddingModelName string = 'text-embedding-3-large'

@description('Embedding model version.')
param embeddingModelVersion string = '1'

@description('Embedding deployment capacity (TPM units).')
param embeddingCapacity int = 120

// --- Cosmos DB ---

@description('Cosmos SQL database name for DecisionDNA memory.')
param cosmosDatabaseName string = 'decisiondna'

@description('Cosmos container that stores the organizational decision memory records.')
param cosmosContainerName string = 'decision-memory'

// --- App Service ---

@description('App Service Plan SKU. P1v3 recommended for the demo/production API; B1 for cheap dev.')
@allowed([
  'B1'
  'B2'
  'P0v3'
  'P1v3'
  'P2v3'
])
param appServicePlanSku string = 'P1v3'

@description('Common tags applied to every resource.')
param tags object = {
  application: 'DecisionDNA'
  workload: 'decision-intelligence'
  managedBy: 'bicep'
}

// ---------------------------------------------------------------------------
// Derived names
// ---------------------------------------------------------------------------

var suffix = uniqueSuffix
var openAiName = '${namePrefix}-openai-${suffix}'
var searchName = '${namePrefix}-search-${suffix}'
var cosmosName = '${namePrefix}-cosmos-${suffix}'
// Key Vault names: 3-24 chars, alphanumerics + dashes, globally unique.
var keyVaultName = take('${namePrefix}-kv-${suffix}', 24)
var planName = '${namePrefix}-plan-${suffix}'
var webAppName = '${namePrefix}-api-${suffix}'

// Built-in Azure RBAC role definition ids
var roleKeyVaultSecretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var roleKeyVaultSecretsUser    = '4633458b-17de-408a-b874-0445c86b69e6'
var roleCognitiveServicesOpenAiUser = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
var roleSearchIndexDataContributor  = '8ebe5a00-799e-43f5-93ac-243d3dce84a7'

// ===========================================================================
// Azure OpenAI  (Cognitive Services account, kind = OpenAI)
// ===========================================================================

resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: openAiLocation
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
}

// Chat model deployment (gpt-5). Standard SKU = pay-as-you-go TPM.
resource chatDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAi
  name: chatModelName
  sku: {
    name: 'Standard'
    capacity: chatCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: chatModelName
      version: chatModelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

// Embedding deployment. Azure OpenAI processes deployment writes serially,
// so we chain this one behind the chat deployment to avoid 409 conflicts.
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAi
  name: embeddingModelName
  dependsOn: [
    chatDeployment
  ]
  sku: {
    name: 'Standard'
    capacity: embeddingCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: embeddingModelName
      version: embeddingModelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

// ===========================================================================
// Azure AI Search  (standard tier — supports vector + semantic search)
// ===========================================================================
// The vector *index* itself is a data-plane object created after deployment
// (see scripts/setup-m365.sh / your indexer pipeline). The service tier here
// must be 'standard' or higher for production vector workloads.

resource search 'Microsoft.Search/searchServices@2024-03-01-preview' = {
  name: searchName
  location: location
  tags: tags
  sku: {
    name: 'standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    semanticSearch: 'standard'
    publicNetworkAccess: 'enabled'
    // Allow both admin keys and Entra RBAC so the agent can use managed identity.
    authOptions: {
      aadOrApiKey: {
        aadAuthFailureMode: 'http401WithBearerChallenge'
      }
    }
  }
}

// ===========================================================================
// Azure Cosmos DB  (serverless, SQL API) — organizational decision memory
// ===========================================================================

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: cosmosName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    disableLocalAuth: false
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous7Days'
      }
    }
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: cosmos
  name: cosmosDatabaseName
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: cosmosDatabase
  name: cosmosContainerName
  properties: {
    resource: {
      id: cosmosContainerName
      // Partition on the owning organization so decisions co-locate per tenant.
      partitionKey: {
        paths: [
          '/orgId'
        ]
        kind: 'Hash'
        version: 2
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/embedding/*'
          }
          {
            path: '/_etag/?'
          }
        ]
      }
      defaultTtl: -1
    }
    // Serverless: no throughput block — capacity is request-based.
  }
}

// ===========================================================================
// Azure Key Vault  (RBAC-based access) + service-connection secrets
// ===========================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource secretOpenAiEndpoint 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'AzureOpenAI-Endpoint'
  properties: {
    value: openAi.properties.endpoint
  }
}

resource secretOpenAiKey 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'AzureOpenAI-ApiKey'
  properties: {
    value: openAi.listKeys().key1
  }
}

resource secretSearchEndpoint 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'AzureSearch-Endpoint'
  properties: {
    value: 'https://${search.name}.search.windows.net'
  }
}

resource secretSearchKey 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'AzureSearch-AdminKey'
  properties: {
    value: search.listAdminKeys().primaryKey
  }
}

resource secretCosmosEndpoint 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'Cosmos-Endpoint'
  properties: {
    value: cosmos.properties.documentEndpoint
  }
}

resource secretCosmosConnString 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'Cosmos-ConnectionString'
  properties: {
    value: cosmos.listConnectionStrings().connectionStrings[0].connectionString
  }
}

// ===========================================================================
// App Service Plan + Web App  (Linux, Node.js 20)
// ===========================================================================

resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: appServicePlanSku
  }
  properties: {
    reserved: true // required for Linux
  }
}

resource webApp 'Microsoft.Web/sites@2024-04-01' = {
  name: webAppName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: appServicePlanSku != 'B1'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVault.properties.vaultUri
        }
        // App reads connection secrets from Key Vault at runtime via its
        // managed identity. Kept as references so secrets never live in config.
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: '@Microsoft.KeyVault(SecretUri=${secretOpenAiEndpoint.properties.secretUri})'
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${secretOpenAiKey.properties.secretUri})'
        }
        {
          name: 'AZURE_OPENAI_CHAT_DEPLOYMENT'
          value: chatModelName
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
          value: embeddingModelName
        }
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: '@Microsoft.KeyVault(SecretUri=${secretSearchEndpoint.properties.secretUri})'
        }
        {
          name: 'AZURE_SEARCH_ADMIN_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${secretSearchKey.properties.secretUri})'
        }
        {
          name: 'COSMOS_ENDPOINT'
          value: '@Microsoft.KeyVault(SecretUri=${secretCosmosEndpoint.properties.secretUri})'
        }
        {
          name: 'COSMOS_DATABASE'
          value: cosmosDatabaseName
        }
        {
          name: 'COSMOS_CONTAINER'
          value: cosmosContainerName
        }
      ]
    }
  }
}

// ===========================================================================
// RBAC role assignments
// ===========================================================================

// --- Web App managed identity → can READ Key Vault secrets ---
resource webAppKvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, roleKeyVaultSecretsUser)
  scope: keyVault
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsUser)
    principalType: 'ServicePrincipal'
  }
}

// --- Web App managed identity → can CALL Azure OpenAI ---
resource webAppOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAi.id, webApp.id, roleCognitiveServicesOpenAiUser)
  scope: openAi
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveServicesOpenAiUser)
    principalType: 'ServicePrincipal'
  }
}

// --- Web App managed identity → can READ/WRITE the search index ---
resource webAppSearchContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(search.id, webApp.id, roleSearchIndexDataContributor)
  scope: search
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleSearchIndexDataContributor)
    principalType: 'ServicePrincipal'
  }
}

// --- Optional: operator (human) gets Key Vault Secrets Officer for local dev ---
resource operatorKvOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(operatorObjectId)) {
  name: guid(keyVault.id, operatorObjectId, roleKeyVaultSecretsOfficer)
  scope: keyVault
  properties: {
    principalId: operatorObjectId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsOfficer)
    principalType: 'User'
  }
}

// --- Optional: operator gets Azure OpenAI access for local testing ---
resource operatorOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(operatorObjectId)) {
  name: guid(openAi.id, operatorObjectId, roleCognitiveServicesOpenAiUser)
  scope: openAi
  properties: {
    principalId: operatorObjectId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveServicesOpenAiUser)
    principalType: 'User'
  }
}

// ===========================================================================
// Outputs  (consumed by setup-m365.sh and the app deployment pipeline)
// ===========================================================================

output openAiName string = openAi.name
output openAiEndpoint string = openAi.properties.endpoint
output chatDeploymentName string = chatModelName
output embeddingDeploymentName string = embeddingModelName

output searchName string = search.name
output searchEndpoint string = 'https://${search.name}.search.windows.net'

output cosmosName string = cosmos.name
output cosmosEndpoint string = cosmos.properties.documentEndpoint
output cosmosDatabaseName string = cosmosDatabaseName
output cosmosContainerName string = cosmosContainerName

output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri

output webAppName string = webApp.name
output webAppDefaultHostName string = webApp.properties.defaultHostName
output webAppPrincipalId string = webApp.identity.principalId
