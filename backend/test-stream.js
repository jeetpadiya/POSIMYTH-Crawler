const http = require('http');

const req = http.request('http://localhost:5000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  let lastTime = Date.now();
  res.on('data', (chunk) => {
    const now = Date.now();
    console.log(`[+${now - lastTime}ms] ${chunk.toString()}`);
    lastTime = now;
  });
  res.on('end', () => {
    console.log('Done');
  });
});

req.write(JSON.stringify({ question: "what is the site about?", topK: 5 }));
req.end();
