/// <reference path="../.astro/types.d.ts" />

type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
