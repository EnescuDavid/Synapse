# /synapse:update — Version Check and Update

Check for plugin updates and apply them.

## Prerequisites
- None. Works anytime.

## Flow

1. Read current version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`
2. Display current version: `Synapse v[version]`
3. Attempt to check for updates:
   - If `gh` CLI is available: query the repository for latest release tag
   - Otherwise: inform user to check manually at the repository URL
4. **If up to date**:
   ```
   Synapse v[version] — you're up to date.
   ```
5. **If update available**:
   ```sql
   Synapse v[current] → v[latest] available

   What's new:
   [changelog summary from latest release]

   Update now? Run:
     /plugin update synapse
   ```

6. **If check fails** (no network, no gh CLI):
   ```
   Synapse v[version]

   Couldn't check for updates automatically.
   Check https://github.com/davidenescu/synapse/releases for the latest version.
   ```

## Compatibility Note
Updates never break existing learner state. New features are additive. If a state migration is ever needed, it happens automatically at the next SessionStart.

## Tone
Utilitarian. Version, status, action if needed. No selling.
