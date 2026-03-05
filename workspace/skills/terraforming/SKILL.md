# terraforming

## Overview
Skill to provision cloud infrastructure using Terraform. Currently focused on GCP, with AWS support planned.
State is kept local for now.

## Workflow Rules
1. **Check Production:** Always check `~/.openclaw/workspace/skills/terraforming/production` for an existing "golden template" first.
2. **Check Staging:** If no production template exists, check `~/.openclaw/workspace/skills/terraforming/staging` for a draft template.
3. **Generate:** If neither exists, generate new Terraform code and place it in the `staging` folder.
4. **Manual Promotion:** DJLoky will manually move templates from `staging` to `production` after review/approval.
5. **Execution:** Run `terraform init`, `terraform plan`, and `terraform apply` on the selected template (production or staging).

## Notes
- Do NOT automatically promote staging templates to production.
- Keep state local per environment folder.

## VM Deployment Rules
- If DJLoky says **"deploy vm"**: 
  - Always list the default VM parameters first (e.g., project, region/zone, machine_type=e2-micro, os=ubuntu-22.04-lts, no public IP/nginx).
  - Explicitly ask if the defaults are OK or if changes are needed. Wait for confirmation before running terraform.
- If DJLoky says **"deploy vm with web server"**:
  - Automatically add NGINX via a startup script.
  - Automatically attach a public IP and configure the necessary HTTP firewall rule (e.g., tcp/80).
