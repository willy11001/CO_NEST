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
    console.log('Logging in as buyer...');
    const loginRes = await requestJson('http://127.0.0.1:5000/api/auth/login', 'POST', {
      email: 'buyer@conest.com',
      password: 'buyer123'
    });

    if (loginRes.status !== 200 || !loginRes.data || !loginRes.data.token) {
      console.error('Login failed:', loginRes.text || JSON.stringify(loginRes.data));
      process.exit(1);
    }
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');

    console.log('\nSubmitting KYC credentials for Buyer (Elie Kamga)...');
    const submitRes = await requestJson('http://127.0.0.1:5000/api/kyc/submit', 'POST', {
      cniNumber: 'AB88776655',
      docFullName: 'Elie Kamga',
      cniFrontImage: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
      cniBackImage: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
      selfieImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
    }, token);

    console.log('Submit KYC Status Code:', submitRes.status);
    console.log('Response Body:', JSON.stringify(submitRes.data || submitRes.text));

    process.exit(0);
  } catch (e) {
    console.error('Process error:', e.message);
    process.exit(1);
  }
}

run();
