terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.3.0"
}

provider "google" {
  project = "project-1268863f-862d-4aa6-b76"
  region  = "us-central1"
  zone    = "us-central1-a"
}

resource "google_compute_instance" "vm" {
  name         = "terraforming-vm-vanilla"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts"
    }
  }

  network_interface {
    network       = "default"
    access_config {
    }
  }

  metadata = {
    "enable-oslogin" = "TRUE"
  }
}

variable "zone" {
  description = "Compute zone to deploy into"
  type        = string
  default     = "us-central1-a"
}
