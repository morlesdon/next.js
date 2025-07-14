import { Suspense } from 'react'

export default function RootLayout({ children, params }) {
  return (
    <html lang="en">
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  )
}
