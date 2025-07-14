export default function Page() {
  return '/new/[teamSlug]/page.tsx'
}

export async function generateStaticParams() {
  return [{ teamSlug: 'vercel' }]
}
