import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Metadata for a discovered agent directory under agentcore/.
 */
export interface AgentInfo {
  /** Directory name, e.g. "general-assistant" */
  name: string;
  /** Absolute path to src/ */
  srcDir: string;
  /** Absolute path to build.sh */
  buildScript: string;
  /** Absolute path to dist/ */
  distDir: string;
}

/**
 * Scan agentcoreRoot for subdirectories containing src/main.py.
 * Returns a sorted list of AgentInfo for deterministic CDK synth.
 */
export function discoverAgents(agentcoreRoot: string): AgentInfo[] {
  const root = resolve(agentcoreRoot);

  if (!existsSync(root)) {
    return [];
  }

  const entries = readdirSync(root, { withFileTypes: true });

  return entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      if (entry.name.startsWith('.')) return false;
      const mainPy = join(root, entry.name, 'src', 'main.py');
      return existsSync(mainPy);
    })
    .map((entry) => ({
      name: entry.name,
      srcDir: join(root, entry.name, 'src'),
      buildScript: join(root, entry.name, 'build.sh'),
      distDir: join(root, entry.name, 'dist'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Compute a SHA-256 content hash over concatenated file buffers.
 * Returns the hex-encoded hash string.
 */
export function computeContentHash(files: Buffer[]): string {
  const hash = createHash('sha256');
  for (const buf of files) {
    hash.update(buf);
  }
  return hash.digest('hex');
}

/**
 * Determine whether an agent needs to be rebuilt.
 * Returns true if the content hash changed or the deployment zip is missing.
 */
export function shouldBuild(currentHash: string, previousHash: string, zipExists: boolean): boolean {
  return currentHash !== previousHash || !zipExists;
}
