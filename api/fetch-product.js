export const config = { runtime: 'edge' }

export default async function handler(req) {
  // Test GET direct depuis navigateur
  if (req.method === 'GET') {
    const testUrl = 'https://www.electroplanet.ma/p2447882-moulinex-lm811-perfectmix.html'
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(testUrl)}`
    const res = await fetch(apiUrl)
    const data = await res.json()
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  const { url } = await new Request(req).json().catch(() => ({}))
  if (!url) return new Response(JSON.stringify({ error: 'No URL' }), { status: 400 })

  try {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl)
    const data = await res.json()
    if (data.status !== 'success') throw new Error('Microlink failed')
    const d = data.data
    let name = d.title || ''
    const separators = [' | ', ' - ', ' – ', ' — ']
    for (const sep of separators) {
      if (name.includes(sep)) { name = name.split(sep)[0].trim(); break }
    }
    return new Response(JSON.stringify({
      name,
      description: (d.description || '').slice(0, 100),
      price: 0,
      image: d.image?.url || d.logo?.url || ''
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
