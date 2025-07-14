import { nextTestSetup } from 'e2e-utils'
import { createRouterAct } from '../router-act'
import { Page } from 'playwright'

describe('segment cache (incremental opt in)', () => {
  const { next, isNextDeploy, isNextDev } = nextTestSetup({
    files: __dirname,
  })
  if (isNextDev) {
    test('ppr is disabled', () => {})
    return
  }

  async function testPrefetchDeduping(linkHref) {
    // This e2e test app is designed to verify that if you prefetch a link
    // multiple times, the prefetches are deduped by the client cache
    // (unless/until they become stale). It works by toggling the visibility of
    // the links and checking whether any prefetch requests are issued.
    //
    // Throughout the duration of the test, we collect all the prefetch requests
    // that occur. Then at the end we confirm there are no duplicates.
    const prefetches = new Map()
    const duplicatePrefetches = new Map()
    const unexpectedResponses = []

    let currentPage: Page
    const browser = await next.browser('/', {
      async beforePageLoad(page) {
        currentPage = page
        await page.route('**/*', async (route) => {
          const request = route.request()
          const headers = await request.allHeaders()
          const isPrefetch =
            headers['rsc'] !== undefined &&
            headers['next-router-prefetch'] !== undefined
          if (isPrefetch) {
            const url = request.url()
            const prefetchInfo = {
              href: new URL(url).pathname,
              segment: headers['Next-Router-Segment-Prefetch'.toLowerCase()],
              base: headers['Next-Router-State-Tree'.toLowerCase()] ?? null,
            }
            const key = JSON.stringify(prefetchInfo)
            if (prefetches.has(key)) {
              duplicatePrefetches.set(key, prefetchInfo)
            } else {
              prefetches.set(key, prefetchInfo)
            }
            const response = await page.request.fetch(request, {
              maxRedirects: 0,
            })
            const status = response.status()
            if (status !== 200) {
              unexpectedResponses.push({
                status,
                url,
                headers: response.headers(),
                response: await response.text(),
              })
            }
            return route.fulfill({ response })
          }
          route.continue()
        })
      },
    })

    // Each link on the test page has a checkbox that controls its visibility.
    // It starts off as hidden.
    const checkbox = await browser.elementByCss(
      `input[data-link-accordion="${linkHref}"]`
    )
    // Confirm the checkbox is not checked
    expect(await checkbox.isChecked()).toBe(false)

    // Click the checkbox to reveal the link and trigger a prefetch
    await checkbox.click()
    await browser.elementByCss(`a[href="${linkHref}"]`)

    // Toggle the visibility of the link. Prefetches are initiated on viewport,
    // so if the cache does not dedupe then properly, this test will detect it.
    await checkbox.click() // hide
    await checkbox.click() // show
    const link = await browser.elementByCss(`a[href="${linkHref}"]`)

    // Navigate to the target link
    await link.click()

    // Confirm the navigation happened
    await browser.elementById('page-content')
    expect(new URL(await browser.url()).pathname).toBe(linkHref)

    // Wait for all pending requests to complete.
    await currentPage.unrouteAll({ behavior: 'wait' })

    // Finally, assert there were no duplicate prefetches and no unexpected
    // responses.
    expect(prefetches).not.toBeEmpty()
    expect(duplicatePrefetches).toBeEmpty()
    expect(unexpectedResponses).toBeEmpty()
  }

  describe('multiple prefetches to same link are deduped', () => {
    it('page with PPR enabled', () => testPrefetchDeduping('/ppr-enabled'))
    // FIXME: When deployed, the _tree prefetch request returns an empty 204.
    ;(isNextDeploy ? it.failing : it)(
      'page with PPR enabled, and has a dynamic param',
      () => testPrefetchDeduping('/ppr-enabled/dynamic-param')
    )
  })

  it(
    'when a link is prefetched with <Link prefetch=true>, no dynamic request ' +
      'is made on navigation',
    async () => {
      let act
      const browser = await next.browser('/mixed-fetch-strategies', {
        beforePageLoad(p) {
          act = createRouterAct(p)
        },
      })

      await act(
        async () => {
          const checkbox = await browser.elementById(
            'ppr-enabled-prefetch-true'
          )
          await checkbox.click()
        },
        {
          includes: 'Dynamic page content',
        }
      )

      // Navigate to fully prefetched route
      const link = await browser.elementByCss('#ppr-enabled-prefetch-true + a')
      await act(
        async () => {
          await link.click()

          // We should be able to fully load the page content, including the
          // dynamic data, before the server responds.
          await browser.elementById('page-content')
        },
        // Assert that no network requests are initiated within this block.
        'no-requests'
      )
    }
  )

  it(
    'when prefetching with prefetch=true, refetches cache entries that only ' +
      'contain partial data',
    async () => {
      let act
      const browser = await next.browser('/mixed-fetch-strategies', {
        beforePageLoad(p) {
          act = createRouterAct(p)
        },
      })

      // Prefetch a link with PPR
      await act(
        async () => {
          const checkbox = await browser.elementById('ppr-enabled')
          await checkbox.click()
        },
        { includes: 'Loading (PPR shell of shared-layout)...' }
      )

      // Prefetch the same link again, this time with prefetch=true to include
      // the dynamic data
      await act(
        async () => {
          const checkbox = await browser.elementById(
            'ppr-enabled-prefetch-true'
          )
          await checkbox.click()
        },
        {
          includes: 'Dynamic content in shared layout',
        }
      )

      // Navigate to the PPR-enabled route
      const link = await browser.elementByCss('#ppr-enabled-prefetch-true + a')
      await act(
        async () => {
          await link.click()

          // If we prefetched all the segments correctly, we should be able to
          // fully load the page content, including the dynamic data, before the
          // server responds.
          //
          // If this fails, it likely means that the partial cache entry that
          // resulted from prefetching the normal link (<Link prefetch={false}>)
          // was not properly re-fetched when the full link (<Link
          // prefetch={true}>) was prefetched.
          await browser.elementById('page-content')
        },
        // Assert that no network requests are initiated within this block.
        'no-requests'
      )
    }
  )
})
