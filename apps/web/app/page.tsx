export default function HomePage() {
  return (
    <main style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui',
      background: '#000',
      color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>🐝</h1>
        <h2 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: -1 }}>Swrm</h2>
        <p style={{ color: '#888', marginTop: '1rem' }}>
          Deploy AI agents. Control from anywhere.
        </p>
        <p style={{ color: '#666', marginTop: '2rem', fontSize: '0.875rem' }}>
          Web app coming soon. Download the mobile app.
        </p>
      </div>
    </main>
  );
}
