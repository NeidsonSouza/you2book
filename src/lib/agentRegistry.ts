/**
 * Generate a CDK-safe runtime name from an agent name.
 *
 * Replaces hyphens with underscores and prepends `you2book_`.
 * Strips any characters that are not alphanumeric or underscores.
 *
 * @param agentName - The agent directory name (e.g. "general-assistant")
 * @returns A CDK-safe runtime name (e.g. "you2book_general_assistant")
 */
export function generateRuntimeName(agentName: string): string {
  const sanitized = agentName.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `you2book_${sanitized}`;
}

/**
 * Build a registry map from agent name to runtime ARN.
 *
 * @param agents - Array of objects with `name` and `arn` fields
 * @returns Record mapping agent name to its runtime ARN
 */
export function buildRegistryMap(agents: Array<{ name: string; arn: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const agent of agents) {
    map[agent.name] = agent.arn;
  }
  return map;
}
