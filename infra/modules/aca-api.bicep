@description('Location for all resources')
param location string

@description('Base name for resources')
param baseName string

@description('Container Apps Environment ID')
param environmentId string

@description('ACR login server')
param acrLoginServer string

@description('User-assigned managed identity resource ID (used for ACR pull)')
param identityId string

@description('Container image tag')
param imageTag string

@description('Azure OpenAI endpoint')
param azureOpenAIEndpoint string

@description('Azure OpenAI API key (optional)')
@secure()
param azureOpenAIApiKey string = ''

@description('Azure OpenAI deployment name')
param azureOpenAIDeployment string

@description('Azure OpenAI resource ID for role assignment')
param azureOpenAIResourceId string

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${baseName}-api'
  location: location
  identity: {
    type: 'SystemAssigned,UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: false
        targetPort: 3001
        transport: 'http'
      }
      secrets: [
        if (!empty(azureOpenAIApiKey)) {
          name: 'azure-openai-api-key'
          value: azureOpenAIApiKey
        }
      ]
      registries: [
        {
          server: acrLoginServer
          identity: identityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${acrLoginServer}/${baseName}-api:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PORT', value: '3001' }
            { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAIEndpoint }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenAIDeployment }
            if (!empty(azureOpenAIApiKey)) { name: 'AZURE_OPENAI_API_KEY', secretRef: 'azure-openai-api-key' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
  }
}

// Deploy role assignment to the resource group where the Azure OpenAI resource lives
module openaiRoleAssignment 'openai-role-assignment.bicep' = {
  if (!empty(azureOpenAIResourceId))
  name: 'openai-role-assignment'
  scope: resourceGroup(split(azureOpenAIResourceId, '/')[4])
  params: {
    openaiAccountName: last(split(azureOpenAIResourceId, '/'))
    principalId: api.identity.principalId
    azureOpenAIResourceId: azureOpenAIResourceId
    apiResourceId: api.id
  }
}

output apiFqdn string = api.properties.configuration.ingress.fqdn
