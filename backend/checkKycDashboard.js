const http = require('http');

function requestJson(url, method, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = data ? JSON.stringify(data) : null;
    const headers = {
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: method,
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await requestJson('http://127.0.0.1:8082/api/admin/login', 'POST', {
      email: 'admin@conest.com',
      password: 'admin123'
    });

    if (loginRes.status !== 200 || !loginRes.data || !loginRes.data.token) {
      console.error('Login failed:', loginRes.text || JSON.stringify(loginRes.data));
      process.exit(1);
    }
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');

    console.log('\nFetching pending KYC requests...');
    const kycRes = await requestJson('http://127.0.0.1:8082/api/admin/kyc/pending', 'GET', null, token);

    console.log('Admin Dashboard KYC Status Code:', kycRes.status);
    console.log('Response Items Count:', kycRes.data?.length);
    console.log('Response Body:', JSON.stringify(kycRes.data || kycRes.text, null, 2));

    process.exit(0);
  } catch (e) {
    console.error('Process error:', e.message);
    process.exit(1);
  }
}

run();
