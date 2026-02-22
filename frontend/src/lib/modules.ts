export type ConsoleModuleId =
  | "vaults"
  | "vault"
  | "create"
  | "crack"
  | "claim"
  | "cancel"
  | "hints"
  | "profile"
  | "logs"
  | "help"
  | "config";

export type ConsoleModule = {
  id: ConsoleModuleId;
  label: string;
  route: string;
  aliases: string[];
  description?: string;
};

export const CONSOLE_MODULES: ConsoleModule[] = [
  {
    id: "vaults",
    label: "VAULTS",
    route: "/vaults",
    aliases: ["vaults", "ls", "list"],
    description: "List vaults on-chain",
  },
  {
    id: "create",
    label: "CREATE",
    route: "/create",
    aliases: ["create", "new"],
    description: "Create a new vault",
  },
  {
    id: "crack",
    label: "CRACK",
    route: "/crack",
    aliases: ["crack", "attempt"],
    description: "Enter PIN / attempt crack",
  },
  {
    id: "claim",
    label: "CLAIM",
    route: "/claim",
    aliases: ["claim", "collect"],
    description: "Secure transfer console",
  },
  {
    id: "cancel",
    label: "CANCEL",
    route: "/cancel",
    aliases: ["cancel", "abort"],
    description: "Cancel/refund (authority)",
  },
  {
    id: "hints",
    label: "HINTS",
    route: "/hints",
    aliases: ["hints", "intel"],
    description: "Hints + redemption",
  },
  {
    id: "profile",
    label: "PROFILE",
    route: "/profile",
    aliases: ["profile", "me"],
    description: "Player dossier",
  },
  {
    id: "logs",
    label: "LOGS",
    route: "/logs",
    aliases: ["logs", "events"],
    description: "Event stream viewer",
  },
  {
    id: "help",
    label: "HELP",
    route: "/help",
    aliases: ["help", "?"],
    description: "Manual + keybinds",
  },
  {
    id: "config",
    label: "CONFIG",
    route: "/config",
    aliases: ["config", "prefs"],
    description: "Client-only visual prefs",
  },
];

export function scoreMatch(query: string, candidate: string) {
  const q = query.trim().toLowerCase();
  const c = candidate.toLowerCase();
  if (!q) return 1;
  if (c === q) return 100;
  if (c.startsWith(q)) return 50;
  if (c.includes(q)) return 10;
  // tiny fuzzy: all chars in order
  let i = 0;
  for (const ch of c) {
    if (ch === q[i]) i++;
    if (i >= q.length) return 3;
  }
  return 0;
}

export function getNavigatorResults(query: string, limit = 8) {
  const q = query.trim();

  // Special suggestion: open VAULT:<id> (not a parser; just a suggestion)
  const openVault = /^open\s+([a-zA-Z0-9_-]{1,64})$/i.exec(q);
  const vaultId = openVault?.[1];

  const scored = CONSOLE_MODULES.flatMap((m) => {
    const candidates = [m.label, m.id, ...m.aliases];
    const best = Math.max(...candidates.map((c) => scoreMatch(q, c)));
    return best > 0 ? [{ module: m, score: best }] : [];
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.module);

  if (vaultId) {
    return [
      {
        id: "vault" as const,
        label: `VAULT:${vaultId.toUpperCase()}`,
        route: `/vault/${encodeURIComponent(vaultId)}`,
        aliases: [],
        description: "Open vault dossier",
      },
      ...scored,
    ].slice(0, limit);
  }

  return scored;
}
