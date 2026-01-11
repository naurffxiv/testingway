# Introduction and overview

## Description

Testingway is the centralized End-to-End (E2E) testing repository for the core NAURFFXIV Ecosystem. It serves as the final “Fortress Gate,” validating the complex interactions between the integrated microservices -- the frontend (naurffxiv), the bot API (moddingway), and the authentication service (authingway) -- in a unified Docker environment.

## Objectives

* Integration Verification: Ensure that changes in one service (e.g., Auth) do not break dependent services (e.g., Frontend).
* Automated Governance: Automatically trigger regression tests via repository\_dispatch whenever a new container image is built in a core repository.  
* Production Parity: Replicate the exact production networking topology using Docker Compose to ensure valid test results.

## Scope

* In-Scope: The core, interconnected services: naurffxiv (web), moddingway (Python Bot), and authingway (Auth Service).  
* Out-of-Scope: Standalone utility bots (e.g., findingway, clearingway) which do not interact with the core authentication or web layers. These services retain their own isolated system tests to strictly limit the complexity and execution time of the E2E suite.

## System architecture

### The “Testing Pyramid” Strategy

The ecosystem employs a split-testing strategy to ensure both speed and reliability.

* Layer 1: Unit Tests (Source Repos): “Fail Fast.” Each individual repo (moddingway, naurffxiv, authingway) runs isolated unit tests. These are blocking. If they fail, the E2E suite is never triggered.  
* Layer 2: E2E Tests (testingway): “Fail Safe.” Only triggered after Layer 1 passes. This verifies the *system* as a whole.

### Event-Driven Architecture

The systems follows an asynchronous trigger model:

1. Trigger: A core repo (e.g., moddingway) pushes a new image to GHCR.  
2. Dispatch: The source repo sends a repository\_dispatch event to testingway.  
3. Orchestration: testingway pulls the specific “candidate” image tag (e.g., :pr-123) and the latest “stable” versions of the other two services.  
4. Execution: Playwright runs tests against the composite environment.  
5. Feedback: testingway reports Pass/Fails status back to the source PR commit status API.

### Major Components

1. The Listener (GitHub Actions): A workflow that acts as the entry point, accepting the commit_sha and repo_name payload.
2. The Orchestrator (Docker Compose): A dynamic configuration file that constructs the naur-net bridge network.
3. The Runner (Playwright): A [Node.js](http://Node.js) container (v.1.57.0-jammy) that executes the test scripts.

## Data Design

### Data Flow

1. Input: JSON Payload from client_payload (SHA, Repo, Image Tags).
2. Environment Injection: Payload data is mapped to Docker Environment Variables (e.g., MODDINGWAY_IMAGE).
3. Output:

   * Test Artifacts: HTML Reports, Traces, and Video recordings (GitHub Artifacts).
   * Status Update: Boolean Pass/Fail sent to GitHub API.

### Test Data Management

* Database State: The runner relies on the services to manage their own ephemeral state (e.g., in-memory SQLite or mocked interfaces).
* Cleanup: The docker compose up \--abort-on-container-exit command ensures the entire environment is destroyed after every run, preventing data pollution between tests.

## Interface Design

### Internal Interfaces (Docker Network: naur-net)

Communication occurs over a private bridge network.

| Service Alias | Internal Port | Protocol | Purpose |
| :---: | :---: | :---: | ----- |
| naurffxiv | 3000 | HTTP | Frontend UI testing |
| moddingway | 8000 | HTTP | REST API endpoints & Health checks |
| authingway | 8080 | HTTP | Authentication tokens & User validation |

### External Interfaces (GitHub API)

* Trigger Protocol: POST /repos/naurffxiv/testingway/dispatches
  * Auth: PAT\_TOKEN (Repo scope)
* Feedback Protocol: POST /repos/{owner}/{repo}/statuses/{sha}
  * Auth: PAT\_TOKEN
  * Usage: Marks the source commit as “Success” or “Failure” to block merging.

## Component Design

### E2E Runner Service

* Purpose: Execute the integration logic.  
* Base Image: mrc.microsoft.com/playwright:v1.57.0-jammy.  
* Logic:  
  * 1\. Wait Strategy: Polls /health endpoints for all services until 200 OK is received.  
  * 2\. Install: Runs npm ci to ensure strict dependency matching.  
  * 3\. Execute: Runs npx playwright test .

### Service Health Checks

To prevent flaky tests, every service component implements a health check.

* Method: curl \-f <http://localhost:PORT/health>.  
* Retry Policy: 5 retries, 10s interval.

## User Interface Design

As a backend tool, the UI consists of developer feedback mechanisms.

### GitHub Checks UI

Developers verify results in their PRs view:

* Success: “E2E Tests (Playwright) – Test passed”  
* Failure: “E2E Tests (Playwright) – Tests failed” (Details linked to testingway logs).

## Assumptions and Dependencies

### Assumptions

* Health Endpoints: All core microservices must expose a /health endpoint.  
* Port Stability: Services must strictly adhere to their assigned ports (3000, 8000, 8080).  
* Isolation: Standalone bots (findingway, clearingway, …) do not require E2E testing in this suite.

### Constraints

* GitHub Flow: The system strictly adheres to GitHub Flow. Feature branches are created from main, tested via PRs, and merged back to main. main is considered always deployable.  
* No Feature Flags: Merged code is live code. The E2E suite serves as the critical validation step before merge to main.  
* Resource Usage: Tests are expensive; spurious triggers should be minimized by ensuring Unit Tests pass first.

## Glossary of Terms

* Core Ecosystem: The interconnected services (naurffxiv, moddingway, authingway) that require integration testing.  
* Standalone Services: Independent bots (findingway) that do not require E2E validation.  
* GitHub Flow: A lightweight, branch-based workflow where deployments are made regularly from the main branch.  
* Repository Dispatch: A GitHub Actions webhook used to trigger workflows across repositories.  
* PAT: Personal Access Token.
