/**
 * Constructs an href from a path template and parameters for typed links
 */
export function constructHref(
  path: string,
  params?: Record<string, string | string[]>,
  searchParams?: Record<string, string | string[]>
): string {
  let href = path

  // Replace dynamic segments with parameter values
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        // Handle catch-all routes like [...slug] and [[...slug]]
        const joinedValue = value.join('/')
        // Handle required catch-all [...slug]
        href = href.replace(`[...${key}]`, joinedValue)
        // Handle optional catch-all [[...slug]]
        href = href.replace(`[[...${key}]]`, joinedValue)
      } else {
        // Handle regular dynamic routes like [slug]
        href = href.replace(`[${key}]`, value)
      }
    }
  }

  // Handle empty optional catch-all routes (remove the empty brackets and preceding slash)
  href = href.replace(/\/\[\[\.\.\.[\w]+\]\]/g, '')

  // In development, warn about missing required parameters
  if (process.env.NODE_ENV !== 'production') {
    const missingParams = href.match(/\[([^\]]+)\]/g)
    if (missingParams) {
      console.warn(
        `Warning: Missing required parameters for path "${path}". Missing: ${missingParams.join(', ')}`
      )
    }
  }

  // Add search params as query string
  if (searchParams) {
    const searchParamsObj = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          searchParamsObj.append(key, v)
        }
      } else {
        searchParamsObj.append(key, value)
      }
    }
    const searchString = searchParamsObj.toString()
    if (searchString) {
      href += `?${searchString}`
    }
  }

  return href
}
