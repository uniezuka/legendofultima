export interface UpdateEntry {
  version: string
  date: string
  summary: string
}

// Newest first.
export const UPDATE_HISTORY: UpdateEntry[] = [
  {
    version: 'Alpha v0.2.0',
    date: 'July 10, 2026',
    summary: 'Accounts & login · Saved campaign progress',
  },
  {
    version: 'Alpha v0.1.0',
    date: 'July 1, 2026',
    summary: 'Full campaign · Online PvP · Save system',
  },
]
