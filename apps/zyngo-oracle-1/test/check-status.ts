async function check() {
  try {
    const res = await fetch('http://localhost:4000/status');
    console.log('Status code:', res.status);
    console.log('Body:', await res.json());
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
check();
