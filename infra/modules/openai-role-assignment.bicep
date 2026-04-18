@description('Azure OpenAI resource name')
param openaiAccountName string

@description('Principal ID to assign the role to')
param principalId string

@description('Full Azure OpenAI resource ID (used for unique role assignment name)')
param azureOpenAIResourceId string

@description('Full API container app resource ID (used for unique role assignment name)')
param apiResourceId string

// Reference the existing Azure OpenAI resource in this resource group
resource openai 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: openaiAccountName
}

// Cognitive Services OpenAI User role for the system-assigned managed identity
resource cognitiveServicesUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(azureOpenAIResourceId, apiResourceId, 'a97b65f3-24c7-4388-baec-2e87135dc908')
  scope: openai
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
  }
}
