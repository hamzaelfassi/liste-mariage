export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { url } = await new Request(req).json().catch(() => ({}))
  if (!url) return new Response(JSON.stringify({ error: 'No URL' }), { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      }
    })
    const html = await res.text()

    // Extraire les métadonnées
    const getMeta = (name) => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
      ]
      for (const p of patterns) {
        const m = html.match(p)
        if (m) return m[1].trim()
      }
      return ''
    }

    // Titre
    let name = getMeta('title')
    if (!name) { const m = html.match(/<title[^>]*>([^<]+)<\/title>/i); if (m) name = m[1].trim() }

    // Image
    let image = getMeta('image')

    // Prix — cherche patterns communs
    let price = 0
    const pricePatterns = [
      /["']price["']\s*:\s*["']?([\d.,]+)/i,
      /class="[^"]*price[^"]*"[^>]*>([\d\s.,]+)\s*(?:MAD|DH|€|\$)?/i,
      /"price":\s*([\d.]+)/i,
      /itemprop="price"[^>]*content="([\d.]+)"/i,
    ]
    for (const p of pricePatterns) {
      const m = html.match(p)
      if (m) { price = parseFloat(m[1].replace(/\s/g, '').replace(',', '.')); break }
    }

    // Description
    let description = getMeta('description')
    if (description && description.length > 100) description = description.slice(0, 97) + '...'

    // Nettoyer le nom
    if (name && name.length > 80) name = name.slice(0, 77) + '...'

    return new Response(JSON.stringify({ name, description, price, image }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
