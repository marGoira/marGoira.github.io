variable "subscription_id" {
  description = "Azure-tilauksen id"
  type        = string
}

variable "project" {
  description = "Projektin lyhenne resurssien nimiin (vain pienet kirjaimet ja numerot)"
  type        = string
  default     = "kantama"
}

variable "environment" {
  description = "Ympäristö, esim. dev tai prod"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Sijainti Function Appille ja tallennukselle (Flex Consumption -tuettu alue)"
  type        = string
  default     = "northeurope"
}

variable "swa_location" {
  description = "Static Web Appin sijainti (Free-taso tukee vain osaa alueista)"
  type        = string
  default     = "westeurope"
}

variable "extra_cors_origins" {
  description = "Lisäosoitteet, joista selain saa kutsua rajapintaa (esim. paikallinen Vite)"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
