export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
  },
  relays: {
    all: ['relays'] as const,
    detail: (name: string) => ['relays', name] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    detail: (jobId: string) => ['jobs', jobId] as const,
  },
  creators: {
    all: ['creators'] as const,
    detail: (username: string) => ['creators', 'detail', username] as const,
    jobs: (username: string) => ['creators', 'jobs', username] as const,
  },
  savedLinks: {
    all: ['saved-links'] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  security: {
    summary: ['security-summary'] as const,
    requests: (filterIP?: string, filterPath?: string) =>
      ['security-requests', filterIP, filterPath] as const,
    events: (filterType?: string, filterIP?: string) =>
      ['security-events', filterType, filterIP] as const,
    audit: ['security-audit'] as const,
  },
  auth: {
    status: ['auth-status'] as const,
  },
  doctor: {
    all: ['doctor'] as const,
  },
  explorer: {
    all: ['explorer'] as const,
    list: (path: string) => ['explorer', 'list', path] as const,
  },
  targetTopics: {
    all: ['target-topics'] as const,
  },
} as const
