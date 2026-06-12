const http = require('http');

const testLogin = (email, password) => {
  const data = JSON.stringify({ email, password });
  
  const options = {
    hostname: 'localhost',
    port: 5002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log(`Sending login request for ${email}...`);
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`Response status: ${res.statusCode}`);
      try {
        const json = JSON.parse(body);
        console.log('Response body:', JSON.stringify(json, null, 2));
      } catch (err) {
        console.log('Failed to parse body:', body);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(data);
  req.end();
};

// Test with customer user
testLogin('user@skywave.com', 'password123');
