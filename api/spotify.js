export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured' });
  }

  try {
    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Could not get Spotify token', details: tokenData });
    }
    const token = tokenData.access_token;
    const { action, q, artistId } = req.query;

    if (action === 'search') {
      // Search then enrich first result with full data
      const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.status(200).json(await r.json());
    }

    if (action === 'artistData') {
      // Fetch albums and full artist data separately
      const [albumsResp, artistResp] = await Promise.all([
        fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const albums = await albumsResp.json();
      const artist = await artistResp.json();

      // Log what we got to debug
      console.log('Artist data:', JSON.stringify(artist).slice(0, 500));

      return res.status(200).json({ albums, artist });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
