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

// Reference the existing Azure OpenAI resource for scoping the role assignment
resource openai 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: last(split(azureOpenAIResourceId, '/'))
}

// Cognitive Services OpenAI User role for the system-assigned managed identity
resource cognitiveServicesUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(azureOpenAIResourceId, api.id, 'a97b65f3-24c7-4388-baec-2e87135dc908')
  scope: openai
  properties: {
    principalId: api.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
  }
}

output apiFqdn string = api.properties.configuration.ingress.fqdn
