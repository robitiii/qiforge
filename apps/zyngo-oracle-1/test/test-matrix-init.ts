import 'dotenv/config';
import { MatrixManager } from '../../../packages/matrix/src/index.js';

async function testInit() {
  console.log('Testing MatrixManager.init()...');
  const mm = MatrixManager.getInstance();
  await mm.init();
  console.log('MatrixManager status:', mm.getInitializationStatus());
}

testInit().catch(console.error);
