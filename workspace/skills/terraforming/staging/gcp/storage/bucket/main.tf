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

resource "google_storage_bucket" "bucket" {
  name          = "kuntal20265465"
  location      = "US"
  uniform_bucket_level_access = true
  force_destroy = true
}

output "bucket_name" {
  value = google_storage_bucket.bucket.name
}
