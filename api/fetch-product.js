export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { url } = await new Request(req).json().catch(() => ({}))
  if (!url) return new Response(JSON.stringify({ error: 'No URL' }), { status: 400 })

  try {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&meta=false&screenshot=false`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (data.status !== 'success') throw new Error('Microlink failed')

    const d = data.data
    return new Response(JSON.stringify({
      name: d.title || '',
      description: d.description?.slice(0, 100) || '',
      price: 0,
      image: d.image?.url || d.logo?.url || ''
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
