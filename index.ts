import Koa from "koa";
import Router, { RouterContext } from "koa-router";
import logger from "koa-logger";
import json from "koa-json";
import passport from "koa-passport";
import cors from '@koa/cors' ;
import koaBody from 'koa-body';
import fs from 'fs';
import path from 'path';
import serve from 'koa-static';
import mount from 'koa-mount';
import { router as articles } from "./routes/articles";
import { router as special } from "./routes/specials";
import { router as authRoutes } from "./routes/auth";
import { router as proxy} from "./routes/proxy";
import { router as hotels } from "./routes/hotels";
import { router as messaging } from "./routes/messaging";

const app: Koa = new Koa();
const router: Router = new Router();

const avatarUploadPath = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadPath)) {
  fs.mkdirSync(avatarUploadPath, { recursive: true });
}

const welcomeAPI = async (ctx: RouterContext, next: any) => {
  ctx.body = {
    msg: "Welcome to the blog API",
  };
  await next();
};
router.get('/api/v1', welcomeAPI);

app.use(cors());
app.use(logger());
app.use(json());

app.use(koaBody({
  multipart: true,
  formidable: {
    uploadDir: avatarUploadPath,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
  }
}));

app.use(passport.initialize());

app.use(router.routes());
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());
app.use(special.routes()).use(special.allowedMethods());
app.use(articles.routes()).use(articles.allowedMethods());
app.use(proxy.routes()).use(proxy.allowedMethods());
app.use(hotels.routes()).use(hotels.allowedMethods());
app.use(messaging.routes()).use(messaging.allowedMethods());

app.use(serve(path.join(process.cwd(), 'docs')));
app.use(mount('/api/v1/uploads', serve(path.join(process.cwd(), 'uploads'))));

app.use(async (ctx: RouterContext, next: any) => {
  try {
    await next();
    if (ctx.status === 404) {
      ctx.status = 404;
      ctx.body = { err: "No such endpoint existed" };
    }
  } catch (err: any) {
    ctx.body = { err: err };
  }
});

app.listen(10888, () => {
  console.log("Koa Started");
});
