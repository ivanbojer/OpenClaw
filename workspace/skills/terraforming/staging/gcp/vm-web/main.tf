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
  name         = "terraforming-vm-web"
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
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y nginx
      systemctl start nginx
      systemctl enable nginx
      echo "<h1>Hello from Terraforming VM Web</h1>" > /var/www/html/index.html
    EOF
  }

  tags = ["http-server"]
}

resource "google_compute_firewall" "http" {
  name    = "terraforming-allow-http"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}

variable "zone" {
  description = "Compute zone to deploy into"
  type        = string
  default     = "us-central1-a"
}
