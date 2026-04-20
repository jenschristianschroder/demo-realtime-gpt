targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'demo-realtime-gpt'

@description('Azure OpenAI endpoint')
param azureOpenAIEndpoint string

@description('Azure OpenAI deployment name')
param azureOpenAIDeployment string = 'gpt-4o-realtime-preview'

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

// API Container App (internal)
module api 'modules/aca-api.bicep' = {
  name: 'api'
  params: {
    location: location
    baseName: baseName
    environmentId: environment.outputs.environmentId
    azureOpenAIEndpoint: azureOpenAIEndpoint
    azureOpenAIDeployment: azureOpenAIDeployment
  }
}

// SPA Container App (external)
module spa 'modules/aca-spa.bicep' = {
  name: 'spa'
  params: {
    location: location
    baseName: baseName
    environmentId: environment.outputs.environmentId
    apiHost: '${baseName}-api'
  }
}

output spaUrl string = spa.outputs.fqdn
output acrLoginServer string = acr.outputs.acrLoginServer
output apiPrincipalId string = api.outputs.principalId
output spaPrincipalId string = spa.outputs.principalId
