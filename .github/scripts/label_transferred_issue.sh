#!/bin/bash
set -e

ISSUE_NUMBER=$1
EVENT_NAME=$2
EVENT_PATH=$3

if [ -z "$ISSUE_NUMBER" ] || [ -z "$EVENT_NAME" ] || [ -z "$EVENT_PATH" ]; then
    echo "Usage: $0 <issue_number> <event_name> <event_path>"
    exit 1
fi

# We only care about transferred issues
ACTION=$(jq -r '.action' "$EVENT_PATH")
if [[ "$ACTION" != "transferred" ]]; then
    echo "Action is '$ACTION', not 'transferred'. Skipping."
    exit 0
fi

SOURCE_REPO=$(jq -r '.changes.old_repository.full_name // empty' "$EVENT_PATH")

if [ -z "$SOURCE_REPO" ]; then
    echo "No source repository found for transferred issue."
    exit 0
fi

echo "Transferred from: $SOURCE_REPO"

LABELS_TO_ADD=()

# Map source repos to labels using a cleaner substring match
if [[ "$SOURCE_REPO" == *authingway* ]]; then
    LABELS_TO_ADD+=("service/authingway")
elif [[ "$SOURCE_REPO" == *moddingway* ]]; then
    LABELS_TO_ADD+=("service/moddingway")
elif [[ "$SOURCE_REPO" == *naurffxiv* ]]; then
    LABELS_TO_ADD+=("service/naurffxiv")
elif [[ "$SOURCE_REPO" == *findingway* ]]; then
    LABELS_TO_ADD+=("service/findingway")
elif [[ "$SOURCE_REPO" == *clearingway* ]]; then
    LABELS_TO_ADD+=("service/clearingway")
fi

if [ ${#LABELS_TO_ADD[@]} -gt 0 ]; then
    LABEL_ARGS=()
    for label in "${LABELS_TO_ADD[@]}"; do
        LABEL_ARGS+=(--add-label "$label")
    done
    
    echo "Applying labels: ${LABELS_TO_ADD[*]}"
    if ! gh issue edit "$ISSUE_NUMBER" "${LABEL_ARGS[@]}"; then
        echo "Error: Failed to apply labels: ${LABELS_TO_ADD[*]}"
        exit 1
    fi
else
    echo "No matching service label found for source repo: $SOURCE_REPO"
fi

exit 0
