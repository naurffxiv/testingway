/**
 * Issue Auto-Labeler
 *
 * Reads the form fields from a GitHub Issue and syncs labels accordingly.
 * On edits, it'll add/remove labels to match — but only the ones it owns.
 * Anything manually applied stays untouched.
 *
 * Label maps are passed in via the LABEL_MAPS env var as JSON.
 */

(async () => {
  const body = context.payload.issue.body || "";
  const labels = [];

  // Parses the LABEL_MAPS input — structured as:
  // { "Form Field Name": { "Option A": "Label A", "Option B": "Label B" } }
  const labelMaps = JSON.parse(process.env.LABEL_MAPS);

  // GitHub Issue Forms render as "### <Label>\n\n<Value>\n" in the body.
  // This pulls out the value for a given form field.
  function getFormValue(label) {
    const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `### ${safeLabel}\\s*\\n\\n([\\s\\S]*?)(?:\\n{2,}|\\n###|$)`,
      "i",
    );
    const match = body.match(regex);
    const value = match ? match[1].trim() : null;

    // These are GitHub's default "nothing selected" states — treat them as empty
    return value === "_No response_" || value === "Other" || value === "None"
      ? null
      : value;
  }

  // Looks up a form value against a map, case-insensitively.
  // Handles things like a user somehow submitting "low" vs "Low".
  function getLabelFromMap(map, value) {
    if (!value) return null;
    const foundKey = Object.keys(map).find(
      (k) => k.toLowerCase() === value.toLowerCase(),
    );
    return foundKey ? map[foundKey] : null;
  }

  // Walk through every field in the label maps and resolve it
  const allManagedLabels = new Set();

  for (const [fieldName, map] of Object.entries(labelMaps)) {
    // Track all possible labels this script owns
    Object.values(map).forEach((l) => allManagedLabels.add(l));

    const value = getFormValue(fieldName);
    const label = getLabelFromMap(map, value);
    if (label) labels.push(label);
  }

  // =========================================================================
  // Sync — figure out what to add and what to remove
  // =========================================================================

  const currentLabels = context.payload.issue.labels.map((l) => l.name);

  const toAdd = labels.filter(
    (l) => !currentLabels.some((c) => c.toLowerCase() === l.toLowerCase()),
  );

  // Only remove labels we own that are no longer selected in the form
  const toRemove = currentLabels.filter((l) => {
    const isManaged = Array.from(allManagedLabels).some(
      (m) => m.toLowerCase() === l.toLowerCase(),
    );
    const isDesired = labels.some((d) => d.toLowerCase() === l.toLowerCase());
    return isManaged && !isDesired;
  });

  // --- Apply changes ---

  if (toAdd.length > 0) {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.issue.number,
      labels: toAdd,
    });
    console.log("Added labels:", toAdd);
  }

  for (const label of toRemove) {
    try {
      await github.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.issue.number,
        name: label,
      });
      console.log("Removed stale label:", label);
    } catch (e) {
      // Race condition — someone (or another run) already removed it
      console.log(`Label "${label}" already gone, skipping.`);
    }
  }

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log("No label changes required.");
  }
})();
