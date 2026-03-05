Terraforming Skill

This skill provisions GCP infrastructure using Terraform. Future AWS support will be added.

Workflow:
- Production templates live in production/
- Draft templates live in staging/
- If neither exists, generate a new staging template.
- You will manually promote from staging to production.
- State is kept locally in the environment folder and per-template folder.
