output "resource_group" {
  value = azurerm_resource_group.main.name
}

output "web_url" {
  value = "https://${azurerm_static_web_app.web.default_host_name}"
}

output "static_web_app_name" {
  value = azurerm_static_web_app.web.name
}

output "swa_deployment_token" {
  description = "Static Web App deployment token (terraform output -raw swa_deployment_token)"
  value       = azurerm_static_web_app.web.api_key
  sensitive   = true
}

output "function_app_name" {
  value = azurerm_function_app_flex_consumption.api.name
}

output "api_url" {
  description = "Set this as VITE_API_URL in web/.env.production"
  value       = "https://${azurerm_function_app_flex_consumption.api.default_hostname}/api"
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}
