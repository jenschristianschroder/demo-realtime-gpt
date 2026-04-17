@description('Location for all resources')
param location string

@description('Base name for resources')
param baseName string

@description('Container Apps Environment ID')
param environmentId string

@description('ACR login server')
param acrLoginServer string

@description('User-assigned managed identity resource ID')
param identityId string

@description('Container image tag')
param imageTag string

@description('Azure OpenAI endpoint')
param azureOpenAIEndpoint string

@description('Azure OpenAI deployment name')
param azureOpenAIDeployment string

@description('Client ID of the user-assigned managed identity')
param identityClientId string

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${baseName}-api'
  location: location
  identity: {
    type: 'UserAssigned'
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
            { name: 'AZURE_CLIENT_ID', value: identityClientId }
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

output apiFqdn string = api.properties.configuration.ingress.fqdn
