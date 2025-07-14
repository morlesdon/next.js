import type { NextConfig } from '../server/config-shared'

export function needsExperimentalReact(config: NextConfig) {
  const { cacheComponents, taint, viewTransition, routerBFCache } =
    config.experimental || {}
  return Boolean(cacheComponents || taint || viewTransition || routerBFCache)
}
