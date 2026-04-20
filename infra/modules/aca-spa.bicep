@description('Location for all resources')
param location string

@description('Base name for resources')
param baseName string

@description('Container Apps Environment ID')
param environmentId string

@description('Internal API host (container app name or host:port)')
param apiHost string

resource spa 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${baseName}-spa'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'spa'
          image: 'mcr.microsoft.com/k8se/quickstart:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'API_HOST', value: apiHost }
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

output fqdn string = spa.properties.configuration.ingress.fqdn
output principalId string = spa.identity.principalId
