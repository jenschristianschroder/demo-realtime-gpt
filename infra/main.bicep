targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'demo-realtime-gpt'

@description('Azure OpenAI resource ID for role assignment')
param azureOpenAIResourceId string

@description('Container image tag')
param imageTag string = 'latest'

@description('Azure OpenAI endpoint')
param azureOpenAIEndpoint string

@description('Azure OpenAI API key (optional; when set, API key auth is used instead of managed identity)')
@secure()
param azureOpenAIApiKey string = ''

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

// User-Assigned Managed Identity + Role Assignments
module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    location: location
    baseName: baseName
    acrId: acr.outputs.acrId
  }
}

// API Container App (internal)
module api 'modules/aca-api.bicep' = {
  name: 'api'
  params: {
    location: location
    baseName: baseName
    environmentId: environment.outputs.environmentId
    acrLoginServer: acr.outputs.acrLoginServer
    identityId: identity.outputs.identityId
    imageTag: imageTag
    azureOpenAIEndpoint: azureOpenAIEndpoint
    azureOpenAIApiKey: azureOpenAIApiKey
    azureOpenAIDeployment: azureOpenAIDeployment
    azureOpenAIResourceId: azureOpenAIResourceId
  }
}

// SPA Container App (external)
module spa 'modules/aca-spa.bicep' = {
  name: 'spa'
  params: {
    location: location
    baseName: baseName
    environmentId: environment.outputs.environmentId
    acrLoginServer: acr.outputs.acrLoginServer
    identityId: identity.outputs.identityId
    imageTag: imageTag
    apiHost: '${baseName}-api'
  }
}

output spaUrl string = spa.outputs.fqdn
output acrLoginServer string = acr.outputs.acrLoginServer
