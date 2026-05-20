export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action, clientId, clientSecret, artistId, token } = req.query;

  try {
    // Get token
    if (action === 'token') {
      const r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    // Search artists
    if (action === 'search') {
      const q = req.query.q;
      const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    // Get full artist data (top tracks + albums in parallel)
    if (action === 'artistData') {
      const [tracksResp, albumsResp] = await Promise.all([
        fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const tracks = await tracksResp.json();
      const albums = await albumsResp.json();
      return res.status(200).json({ tracks, albums });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
