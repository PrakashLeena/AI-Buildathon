export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '3rem', maxWidth: 640 }}>
      <h1>AI Buildathon — Backend API</h1>
      <p>This service exposes JSON API routes only. It has no public UI.</p>
      <ul>
        <li><code>GET /api/health</code></li>
        <li><code>POST /api/registrations</code></li>
      </ul>
      <p>The frontend app lives in the sibling <code>frontend/</code> project.</p>
    </main>
  );
}
