locals {
  name   = "${var.project}-${var.environment}"
  suffix = random_string.suffix.result
  tags   = merge({ project = var.project, environment = var.environment, managed_by = "terraform" }, var.tags)
}

resource "random_string" "suffix" {
  length  = 5
  upper   = false
  special = false
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

# ---------------------------------------------------------------------------
# Storage: Table Storage for game saves, Blob for future files
# (e.g. flight replays, player images) and the Function App's deployment packages.
# ---------------------------------------------------------------------------
resource "azurerm_storage_account" "main" {
  name                            = substr("st${var.project}${var.environment}${local.suffix}", 0, 24)
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false # Entra ID / managed identity only
  tags                            = local.tags
}

resource "azurerm_storage_container" "deployments" {
  name                  = "app-package"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "replays" {
  name                  = "replays"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

# The game saves table ("saves") is created when the API starts (CreateIfNotExists).
# That way the user running Terraform needs no data plane permissions while keys are disabled.

# ---------------------------------------------------------------------------
# Monitoring
# ---------------------------------------------------------------------------
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.tags
}

# ---------------------------------------------------------------------------
# Frontend: Static Web App (Free)
# ---------------------------------------------------------------------------
resource "azurerm_static_web_app" "web" {
  name                = "swa-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.swa_location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
}

# ---------------------------------------------------------------------------
# Backend: C# Function App, Flex Consumption (pay only for usage)
# ---------------------------------------------------------------------------
resource "azurerm_service_plan" "api" {
  name                = "asp-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "FC1"
  tags                = local.tags
}

resource "azurerm_function_app_flex_consumption" "api" {
  name                = "func-${local.name}-${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.api.id

  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.main.primary_blob_endpoint}${azurerm_storage_container.deployments.name}"
  storage_authentication_type = "SystemAssignedIdentity"

  runtime_name           = "dotnet-isolated"
  runtime_version        = "8.0"
  maximum_instance_count = 40
  instance_memory_in_mb  = 2048

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.main.connection_string
    cors {
      allowed_origins = concat(["https://${azurerm_static_web_app.web.default_host_name}"], var.extra_cors_origins)
    }
  }

  app_settings = {
    "AzureWebJobsStorage__accountName" = azurerm_storage_account.main.name
    "Storage__TableEndpoint"           = azurerm_storage_account.main.primary_table_endpoint
    "Storage__SavesTable"              = "saves"
  }

  tags = local.tags
}

# The Function App's identity gets storage access without keys.
locals {
  api_roles = [
    "Storage Blob Data Owner",       # deployment package + host
    "Storage Queue Data Contributor", # Functions host
    "Storage Table Data Contributor", # game saves
  ]
}

resource "azurerm_role_assignment" "api_storage" {
  for_each             = toset(local.api_roles)
  scope                = azurerm_storage_account.main.id
  role_definition_name = each.value
  principal_id         = azurerm_function_app_flex_consumption.api.identity[0].principal_id
}
