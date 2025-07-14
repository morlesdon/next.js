import loadConfig from './config'

describe('loadConfig', () => {
  describe('nextConfig.images defaults', () => {
    it('should assign a `images.remotePatterns` when using assetPrefix', async () => {
      const result = await loadConfig('', __dirname, {
        customConfig: {
          assetPrefix: 'https://cdn.example.com',
          images: {
            formats: ['image/webp'],
          },
        },
      })

      expect(result.images.remotePatterns).toMatchInlineSnapshot(`
        [
          {
            "hostname": "cdn.example.com",
            "port": "",
            "protocol": "https",
          },
        ]
      `)
    })

    it('should not assign a duplicate `images.remotePatterns` value when using assetPrefix', async () => {
      let result = await loadConfig('', __dirname, {
        customConfig: {
          assetPrefix: 'https://cdn.example.com',
          images: {
            formats: ['image/webp'],
            remotePatterns: [
              {
                hostname: 'cdn.example.com',
                port: '',
                protocol: 'https',
              },
            ],
          },
        },
      })

      expect(result.images.remotePatterns.length).toBe(1)

      result = await loadConfig('', __dirname, {
        customConfig: {
          assetPrefix: 'https://cdn.example.com/foobar',
          images: {
            formats: ['image/webp'],
            remotePatterns: [
              {
                hostname: 'cdn.example.com',
                port: '',
                protocol: 'https',
              },
            ],
          },
        },
      })

      expect(result.images.remotePatterns.length).toBe(1)
    })
  })

  describe('canary-only features', () => {
    beforeAll(() => {
      process.env.__NEXT_VERSION = '14.2.0'
    })

    afterAll(() => {
      delete process.env.__NEXT_VERSION
    })

    it('should not print a stack trace when throwing an error', async () => {
      const loadConfigPromise = loadConfig('', __dirname, {
        customConfig: {
          experimental: {
            cacheComponents: true,
          },
        },
      })

      await expect(loadConfigPromise).rejects.toThrow(
        /The experimental feature "experimental.cacheComponents" can only be enabled when using the latest canary version of Next.js./
      )

      try {
        await loadConfigPromise
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error)

        // Check that there's no stack trace
        expect(error.stack).toBeUndefined()
      }
    })

    it('errors when using cacheComponents if not in canary', async () => {
      await expect(
        loadConfig('', __dirname, {
          customConfig: {
            experimental: {
              cacheComponents: true,
            },
          },
        })
      ).rejects.toThrow(
        /The experimental feature "experimental.cacheComponents" can only be enabled when using the latest canary version of Next.js./
      )
    })

    it('errors when using persistentCaching if not in canary', async () => {
      await expect(
        loadConfig('', __dirname, {
          customConfig: {
            experimental: {
              turbopackPersistentCaching: true,
            },
          },
        })
      ).rejects.toThrow(
        /The experimental feature "experimental.turbopackPersistentCaching" can only be enabled when using the latest canary version of Next.js./
      )
    })
  })

  describe('with a canary version', () => {
    beforeAll(() => {
      process.env.__NEXT_VERSION = '15.4.0-canary.35'
    })

    afterAll(() => {
      delete process.env.__NEXT_VERSION
    })

    it('errors when cacheComponents is enabled but PPR is disabled', async () => {
      await expect(
        loadConfig('', __dirname, {
          customConfig: {
            experimental: {
              cacheComponents: true,
              ppr: false,
            },
          },
        })
      ).rejects.toThrow(
        '`experimental.ppr` and `experimental.cacheComponents` cannot be set to different values. Please remove `experimental.ppr` from next.config.js.'
      )
    })

    it('errors when PPR set to "incremental"', async () => {
      await expect(
        loadConfig('', __dirname, {
          customConfig: {
            experimental: {
              ppr: 'incremental',
            },
          },
        })
      ).rejects.toThrow(
        '`experimental.ppr` cannot be set to "incremental" as cache components does not support it. Please remove it from next.config.js.'
      )
    })

    it('migrates experimental.dynamicIO to experimental.cacheComponents', async () => {
      process.env.__NEXT_VERSION = 'canary'

      const result = await loadConfig('', __dirname, {
        customConfig: {
          experimental: {
            dynamicIO: true,
          },
        },
        silent: true,
      })

      expect(result.experimental.cacheComponents).toBe(true)
      expect(result.experimental.dynamicIO).toBeUndefined()

      delete process.env.__NEXT_VERSION
    })

    it('preserves cacheComponents when both dynamicIO and cacheComponents are set', async () => {
      process.env.__NEXT_VERSION = 'canary'

      const result = await loadConfig('', __dirname, {
        customConfig: {
          experimental: {
            dynamicIO: true,
            cacheComponents: false,
          },
        },
        silent: true,
      })

      expect(result.experimental.cacheComponents).toBe(false)
      expect(result.experimental.dynamicIO).toBeUndefined()

      delete process.env.__NEXT_VERSION
    })

    it('warns when using deprecated experimental.dynamicIO', async () => {
      process.env.__NEXT_VERSION = 'canary'

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await loadConfig('', __dirname, {
        customConfig: {
          experimental: {
            dynamicIO: true,
          },
        },
        silent: false,
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '`experimental.dynamicIO` has been renamed to `experimental.cacheComponents`'
        )
      )

      consoleSpy.mockRestore()
      delete process.env.__NEXT_VERSION
    })
  })
})
