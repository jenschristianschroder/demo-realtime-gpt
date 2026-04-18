@description('Location for all resources')
param location string

@description('Base name for resources')
param baseName string

@description('ACR resource ID')
param acrId string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${baseName}-identity'
  location: location
}

// AcrPull role assignment
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acrId, identity.id, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  scope: acr
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

// Reference existing ACR for scope
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: replace('${baseName}acr', '-', '')
}

output identityId string = identity.id
output identityPrincipalId string = identity.properties.principalId
