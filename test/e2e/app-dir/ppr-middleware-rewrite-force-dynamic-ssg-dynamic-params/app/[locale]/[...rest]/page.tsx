import { connection } from 'next/server'
import { type Params, expectedParams } from '../../../expected'

export default async function CatchAll({
  params,
}: {
  params: Promise<Params>
}) {
  await connection()
  const received = await params

  return <p>{JSON.stringify(received)}</p>
}

export async function generateStaticParams(): Promise<Params[]> {
  return [expectedParams]
}
