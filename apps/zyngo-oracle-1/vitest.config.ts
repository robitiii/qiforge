import { defineConfig, mergeConfig } from 'vitest/config';
import nestConfig from '@ixo/vitest-config/nest';

export default defineConfig(({ mode }) => {
  if (mode === 'int') {
    const merged = mergeConfig(nestConfig, {});
    merged.test = {
      ...merged.test,
      include: ['test/**/*.int.test.ts'],
      exclude: ['node_modules', 'dist'],
      testTimeout: 120_000,
      hookTimeout: 120_000,
      setupFiles: ['./test/integration/setup.ts'],
      fileParallelism: false,
    };
    return merged;
  }

  return mergeConfig(nestConfig, {});
});
