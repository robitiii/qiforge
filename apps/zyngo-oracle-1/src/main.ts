import 'dotenv/config';

import {
  createOracleApp,
  EditorPlugin,
  type AuthExcludedRoute,
} from '@ixo/oracle-runtime';
import {
  Controller,
  Get,
  Logger,
  Module,
  RequestMethod,
  type DynamicModule,
  type Type,
} from '@nestjs/common';
import * as sdk from 'matrix-js-sdk';
import { config } from './config.js';
import { ZynGoPlugin } from './plugins/zyngo/index.js';

@Controller('status')
class StatusController {
  @Get()
  get() {
    return {
      status: 'ok',
      oracle: 'ZynGo-Oracle-1',
      domain: 'Yoma / IXO Ecosystem',
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [StatusController] })
class StatusModule {}

const AUTH_EXCLUDED_ROUTES: AuthExcludedRoute[] = [
  { path: 'status', method: RequestMethod.GET },
];

async function bootstrap(): Promise<void> {
  const matrixBaseUrl = process.env.MATRIX_BASE_URL;
  const matrixUserId = process.env.MATRIX_ORACLE_ADMIN_USER_ID;
  const matrixAccessToken = process.env.MATRIX_ORACLE_ADMIN_ACCESS_TOKEN;

  let matrixClient: ReturnType<typeof sdk.createClient> | undefined;
  if (matrixBaseUrl && matrixUserId && matrixAccessToken) {
    matrixClient = sdk.createClient({
      baseUrl: matrixBaseUrl,
      userId: matrixUserId,
      accessToken: matrixAccessToken,
    });
  }

  const nestModules: Array<Type | DynamicModule> = [StatusModule];

  const app = await createOracleApp({
    config,
    logger: Logger,
    plugins: [
      new ZynGoPlugin(),
      ...(matrixClient ? [new EditorPlugin({ matrixClient })] : []),
    ],
    nestModules,
    authExcludedRoutes: AUTH_EXCLUDED_ROUTES,
  });

  app.onPluginStatusChange((event: { plugin: string; to: string }) => {
    Logger.log(`[ZynGo-Plugin] ${event.plugin} status: ${event.to}`);
  });

  app.onError((err: Error, source: string) => {
    Logger.error(`[ZynGo-Runtime] ${source}: ${err.message}`);
  });

  const status = app.plugins.status();
  Logger.log(`[ZynGo] Loaded plugins: ${status.loaded.join(', ') || '(none)'}`);

  await app.listen();
}

bootstrap().catch((err) => {
  Logger.error('ZynGo-Oracle-1 failed to start:', err);
  process.exit(1);
});
