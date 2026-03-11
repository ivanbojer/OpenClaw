---
name: cloud-ops
description: |
  Deployment tool that provisions infrastructure into cloud environments through simple human commands like "deploy vm" or "deploy bucket". It uses Terraform under the hood.
metadata:
  openclaw:
    requires:
      bins:
        - terraform
    emoji: "🚀"
---

# Cloud Ops

## What it does
Cloud Ops is a cloud deployment tool that provisions infrastructure into cloud environments through simple human commands like: "deploy vm" or "deploy bucket". It supports multiple cloud providers (e.g., AWS, GCP, Azure).

It uses Terraform CLI under the hood.

## Default Parameters for GCP Deployments
When deploying resources to GCP, the following default parameters will be used unless the user specifies otherwise:

- **Project:** project-1268863f-862d-4aa6-b76 (ask for GCP project otherwise)
- **Region/Zone:** us-central-1 (unless specified otherwise)
- **Machine Type:** e2-micro
- **OS Image:** ubuntu-22.04-lts
- **Public IP:** No (unless web server requested)
- **Web Server:** No (unless requested)

## Workflow

When a user requests a deployment, follow this workflow:
1.  **Check Production:** Look for an existing template for the requested resource in the `production/<cloud>/` folder.
2.  **Check Staging:** If not found in production, check for an existing template in the `staging/<cloud>/` folder.
3.  **Generate New Plan:** If neither folder has the template, generate a new plan file in the `staging/<cloud>/` folder, following the `<cloud>-<resource>.tf` naming convention (e.g., `staging/gcp/gcp-vm.tf`).
4. **Display Variables:** Display the default parameters from above for the deployment and ask the user if they want to override any of them before proceeding with the deployment.
5. **Deploy:** Once the user confirms the parameters, proceed with the deployment using the selected or newly generated plan.

## Guardrails
- Always reuse existing templates if they match the requested resource and cloud provider, even if the user did not specify all parameters (e.g., region, machine type). The templates should be designed to use variables for these parameters, allowing for flexibility while still reusing the same base configuration. Do not delete resource unless I explicitly ask you to. If I ask for an additional resource of the same type keep modifying and adding / removing it from the same plan template file. 
- If I ask for a resource that is not supported, respond with "Sorry, I don't support that resource yet." and do not attempt to generate a plan. Supported resources include:
  - Virtual Machines (VMs)
  - Storage Buckets
  - Elastic IP Addresses
  - Web Servers (e.g., Apache, Nginx)
- If I ask you to deploy a web server, you should generate a Terraform plan that provisions a VM and installs the requested web server software on it. The plan should include necessary configurations to ensure the web server is accessible (e.g., opening the appropriate ports). Given the complexity of deploying a web server, you should always generate a new plan for this resource, even if there are existing VM templates available, to ensure that all necessary configurations are included.

  ## Failure handling
  - If the deployment fails, provide a clear error message indicating what went wrong and suggest possible solutions (e.g., "Deployment failed due to insufficient permissions. Please check your IAM roles and try again.").
  - If the deployment fails due to an issue with the Terraform plan, provide a summary of the error and suggest possible fixes (e.g., "Deployment failed due to a syntax error in the Terraform plan. Please review the plan file for any syntax issues and try again.").
  - If the deployment fails due to missing parameters, prompt the user to provide the necessary parameters and attempt the deployment again.

  ## Examples
  User: "Deploy a VM in GCP."
  Assistant: "I found an existing template for a GCP VM in production. Do you want to use it? (yes/no)"