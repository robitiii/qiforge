import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function refreshMatrixToken() {
  const baseUrl = process.env.MATRIX_BASE_URL || 'https://testmx.ixo.earth';
  const user = process.env.MATRIX_ORACLE_ADMIN_USER_ID;
  const password = process.env.MATRIX_ORACLE_ADMIN_PASSWORD;

  console.log('Logging into Matrix as', user, '...');
  const res = await fetch(baseUrl + '/_matrix/client/v3/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user,
      },
      password,
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    console.error('Login failed:', data);
    return;
  }

  console.log('Got fresh access token:', data.access_token);
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /MATRIX_ORACLE_ADMIN_ACCESS_TOKEN=.*/,
    'MATRIX_ORACLE_ADMIN_ACCESS_TOKEN=' + data.access_token,
  );
  fs.writeFileSync(envPath, envContent);
  console.log('Updated .env with fresh access token!');
}

refreshMatrixToken().catch(console.error);
