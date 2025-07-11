import Link from 'next/link'

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <div>
      <h2>Login Page</h2>
      <p>Please log in to continue.</p>
      <Link
        path="/blog/[slug]"
        params={{ slug: 'hello' }}
        searchParams={{ utm_source: 'random.com' }}
      >
        Dashboard
      </Link>
    </div>
  )
}
