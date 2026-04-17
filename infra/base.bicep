targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'demo-realtime-gpt'

@description('Azure OpenAI resource ID for role assignment')
param azureOpenAIResourceId string

// Container Registry
module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    location: location
    baseName: baseName
  }
}

// Container Apps Environment
module environment 'modules/aca-environment.bicep' = {
  name: 'environment'
  params: {
    location: location
    baseName: baseName
  }
}

// User-Assigned Managed Identity + Role Assignments
module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    location: location
    baseName: baseName
    acrId: acr.outputs.acrId
    azureOpenAIResourceId: azureOpenAIResourceId
  }
}

output acrLoginServer string = acr.outputs.acrLoginServer
