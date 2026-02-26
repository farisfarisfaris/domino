export async function dominoFetch(path, { brokerUrl, adminKey, method = 'GET', body } = {}) {
  const url = `${brokerUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (adminKey) {
    headers['Authorization'] = `Bearer ${adminKey}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return res.json();
}
