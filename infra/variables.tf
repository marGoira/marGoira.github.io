variable "subscription_id" {
  description = "Azure subscription id"
  type        = string
}

variable "project" {
  description = "Project short name for resource names (lowercase letters and digits only)"
  type        = string
  default     = "kantama"
}

variable "environment" {
  description = "Environment, e.g. dev or prod"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Location for the Function App and storage (a region that supports Flex Consumption)"
  type        = string
  default     = "northeurope"
}

variable "swa_location" {
  description = "Static Web App location (the Free tier supports only some regions)"
  type        = string
  default     = "westeurope"
}

variable "extra_cors_origins" {
  description = "Extra origins the browser may call the API from (e.g. local Vite)"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
