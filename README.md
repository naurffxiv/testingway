# Testingway (E2E)

Automated End-to-End testing suite for the NaurFFXIV ecosystem.

## Architecture

```mermaid
graph TD
    subgraph GitHub_Actions ["GitHub Actions Environment"]
        Listener[E2E Listener]
    end

    subgraph Docker_Network ["Docker Network (naur-net)"]
        Runner[Playwright Runner]
        Site[naurffxiv :3000]
        Bot[moddingway :8000]
        Auth[authingway :8080]
    end

    Listener -->|docker compose up| Runner
    Runner -->|Test HTTP| Site
    Runner -->|Test HTTP| Bot
    Runner -->|Test HTTP| Auth

```

## Run (Auto-Cleanup)

```bash
docker compose up --build --abort-on-container-exit

```

## CI Trigger (cURL)

### Example: Triggering from moddingway's workflow

When `moddingway` builds a new version, it triggers E2E tests with its fresh image while using stable versions of other services.

*Requires `PAT_TOKEN` with `repo` scope.*

### CI/CD Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant App as App Repo (naurffxiv)
    participant E2E as E2E Repo (testingway)
    participant GHCR as Container Registry

    Dev->>App: Push Code
    App->>GHCR: Build & Push Image
    App->>E2E: Trigger Dispatch (JSON)
    
    activate E2E
    E2E->>GHCR: Pull New Image
    E2E->>E2E: Run Docker Compose
    E2E-->>App: Report Status (Pass/Fail)
    deactivate E2E

```

### Command

```bash
curl -X POST \
  -H "Authorization: token ${{ secrets.PAT_TOKEN }}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/naurffxiv/testingway/dispatches \
  -d '{
    "event_type": "trigger-e2e-check",
    "client_payload": {
      "repo_name": "naurffxiv/moddingway",
      "commit_sha": "${{ github.sha }}",
      "naurffxiv_image": "ghcr.io/naurffxiv/naurffxiv:latest",
      "moddingway_image": "ghcr.io/naurffxiv/moddingway:${{ github.sha }}",
      "authingway_image": "ghcr.io/naurffxiv/authingway:latest"
    }
  }'

```

## Env Vars

`NAURFFXIV_URL`, `MODDINGWAY_URL`, `AUTHINGWAY_URL`
`NAURFFXIV_IMAGE`, `MODDINGWAY_IMAGE`, `AUTHINGWAY_IMAGE`
