import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

async function main() {
  console.log('============================================================');
  console.log('   Google Drive OAuth 2.0 Authorization Tool                ');
  console.log('============================================================\n');

  let clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  // If passed as CLI args: tsx scripts/get-gdrive-refresh-token.ts <clientId> <clientSecret>
  if (process.argv[2]) clientId = process.argv[2].trim();
  if (process.argv[3]) clientSecret = process.argv[3].trim();

  if (!clientId || !clientSecret) {
    console.log('⚠️ Missing Google OAuth Client ID or Client Secret.\n');
    console.log('To set up OAuth 2.0 in your existing "srsmapaper" project:');
    console.log('  1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials');
    console.log('  2. Click "+ Create Credentials" > "OAuth client ID"');
    console.log('     - If prompted to configure the OAuth consent screen:');
    console.log('       • User Type: "External"');
    console.log('       • App Name: "SRSMA TestApp"');
    console.log('       • Developer Email: your email');
    console.log('       • Test Users: Add your Google account email');
    console.log('     - Application type: "Web application"');
    console.log(`     - Authorized redirect URIs: Add "${REDIRECT_URI}"`);
    console.log('  3. Click "Create" and copy your Client ID and Client Secret.\n');
    console.log('Then run this command with your credentials:');
    console.log('  npx tsx scripts/get-gdrive-refresh-token.ts <CLIENT_ID> <CLIENT_SECRET>\n');
    console.log('Or add them to your .env file:');
    console.log('  GOOGLE_CLIENT_ID=your_client_id');
    console.log('  GOOGLE_CLIENT_SECRET=your_client_secret\n');
    process.exit(1);
  }

  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive');
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent`;

  console.log('👉 Please open the following URL in your browser to authorize access to your Google Drive:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization...\n');

  // Start local server to receive the callback
  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/oauth2callback')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error || !code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h2>Authorization Failed</h2><p>${error || 'Missing code'}</p>`);
      console.error('❌ Authorization was cancelled or failed:', error);
      server.close();
      process.exit(1);
    }

    try {
      console.log('Received authorization code, exchanging for tokens...');
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.refresh_token) {
        throw new Error(
          `No refresh_token returned. Did you already authorize without prompt=consent? Response: ${JSON.stringify(tokenData)}`
        );
      }

      const refreshToken = tokenData.refresh_token;

      // Update .env file
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      function setOrAppendEnv(key: string, value: string) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }

      setOrAppendEnv('GOOGLE_CLIENT_ID', clientId!);
      setOrAppendEnv('GOOGLE_CLIENT_SECRET', clientSecret!);
      setOrAppendEnv('GOOGLE_REFRESH_TOKEN', refreshToken);

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #10b981;">✅ Authorization Successful!</h1>
          <p>Your Google Drive OAuth refresh token has been saved to <code>.env</code>.</p>
          <p>You can close this tab and return to the terminal.</p>
        </div>
      `);

      console.log('\n============================================================');
      console.log('✅ Success! Google Drive OAuth 2.0 Credentials Saved to .env:');
      console.log(`   GOOGLE_CLIENT_ID=${clientId}`);
      console.log(`   GOOGLE_CLIENT_SECRET=${clientSecret.slice(0, 8)}...`);
      console.log(`   GOOGLE_REFRESH_TOKEN=${refreshToken.slice(0, 12)}...`);
      console.log('============================================================\n');
      console.log('Now you can run the migration tool:');
      console.log('   npm run migrate:gdrive\n');

      server.close();
      process.exit(0);
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h2>Token Exchange Failed</h2><p>${err.message}</p>`);
      console.error('❌ Token exchange failed:', err);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT);
}

main().catch(console.error);
