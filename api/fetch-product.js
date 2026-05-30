export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { url } = await new Request(req).json().catch(() => ({}))
  if (!url) return new Response(JSON.stringify({ error: 'No URL' }), { status: 400 })

  try {
    // On demande à Microlink d'extraire aussi le prix via sélecteur CSS
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&data.price.selector=.price&data.price.type=text&data.price2.selector=[itemprop="price"]&data.price2.attr=content`
    const res = await fetch(apiUrl)
    const data = await res.json()

    if (data.status !== 'success') throw new Error('Microlink failed')

    const d = data.data

    let name = d.title || ''
    const separators = [' | ', ' - ', ' – ', ' — ']
    for (const sep of separators) {
      if (name.includes(sep)) { name = name.split(sep)[0].trim(); break }
    }

    // Extraire le prix depuis plusieurs sources possibles
    let price = 0
    const rawPrice = d.price2 || d.price || ''
    if (rawPrice) {
      const cleaned = String(rawPrice).replace(/[^\d.,]/g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      if (!isNaN(parsed)) price = parsed
    }

    // Si pas trouvé, chercher dans la description
    if (!price) {
      const priceMatch = (d.description || '').match(/([\d\s]+(?:[.,]\d+)?)\s*(?:MAD|DH)?/)
      if (priceMatch) {
        const p = parseFloat(priceMatch[1].replace(/\s/g, ''))
        if (!isNaN(p) && p > 10) price = p
      }
    }

    return new Response(JSON.stringify({
      name,
      description: (d.description || '').slice(0, 100),
      price,
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
