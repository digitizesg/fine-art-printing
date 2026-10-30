// Reads Vercel Web Analytics for /admin/insights. Server-side only: the token
// (VERCEL_ANALYTICS_TOKEN, a Vercel access token with access to the team) never
// reaches the browser. Production traffic only, which is Vercel's default.
// Same shape as jcplaw.com.sg's src/lib/vercelAnalytics.ts.
// The project id: VERCEL_ANALYTICS_PROJECT_ID if set, otherwise the id Vercel
// itself gives every deployment (VERCEL_PROJECT_ID, a system variable).
const PROJECT_ID =
  import.meta.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID || ''
const TOKEN = import.meta.env.VERCEL_ANALYTICS_TOKEN || process.env.VERCEL_ANALYTICS_TOKEN || ''
const TEAM_ID = 'team_xVFpKyElR79OchBBy0e4mQfO'
const API = 'https://api.vercel.com/v1/query/web-analytics'

export type Row = Record<string, string | number> & { visitors: number }
export type Range = { since: string; until: string }

export function analyticsConfigured() {
  return Boolean(TOKEN && PROJECT_ID)
}

// Vercel allows about 400 analytics queries an hour for the whole team (shared
// with the jcplaw and Flex Fitness dashboards), and one load of this dashboard
// makes about 24. The insights page moves its clock in 10-minute steps (see
// STEP there), so loads within the same 10 minutes ask the same questions and
// are answered from here. If Vercel refuses (429), the latest answer to the
// same question for the same period length is used instead of an error.
const TTL = 10 * 60 * 1000
const fresh = new Map<string, { at: number; data: unknown }>()
const latest = new Map<string, unknown>()

async function get(path: string, params: Record<string, string | number | string[] | undefined>) {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID })
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    for (const one of Array.isArray(v) ? v : [v]) qs.append(k, String(one))
  }
  const key = `${path}?${qs}`
  // Same question, same period length and same distance from "now": the
  // previous 30 days stays distinct from the current 30 days.
  const since = Date.parse(String(params.since)), until = Date.parse(String(params.until))
  const shape = `${path}?${[...qs].filter(([k]) => k !== 'since' && k !== 'until').map((p) => p.join('=')).join('&')}|${until - since}|${Math.round((Date.now() - until) / 86400000)}`
  const hit = fresh.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data as any
  const res = await fetch(`${API}/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) {
    if (latest.has(shape)) return latest.get(shape) as any // a slightly older answer beats an error
    throw new Error(res.status === 429 ? "Vercel's hourly limit was reached, so the figures will be back within the hour" : `Vercel analytics ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()).data
  fresh.set(key, { at: Date.now(), data })
  latest.set(shape, data)
  return data
}

export const visitsBy = (r: Range, by: string | string[], limit = 10, filter?: string): Promise<Row[]> =>
  get('visits/aggregate', { ...r, by, limit, filter })
export const eventsBy = (r: Range, by: string | string[], limit = 10, filter?: string): Promise<Row[]> =>
  get('events/aggregate', { ...r, by, limit, filter })
