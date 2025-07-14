export default async function Layout({ children }) {
  'use cache'

  return (
    <>
      <div data-layout={Math.random().toString(16).slice(2)} />
      {children}
    </>
  )
}
