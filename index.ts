import Koa from "koa";
import Router, { RouterContext } from "koa-router";
import logger from "koa-logger";
import json from "koa-json";
import bodyParser from "koa-bodyparser";
import passport from "koa-passport";
import cors from '@koa/cors' ;
import { router as articles } from "./routes/articles";
import { router as special } from "./routes/specials";
import { router as users } from "./routes/users";
import { router as auth } from "./routes/auth";
import serve from 'koa-static';


const app: Koa = new Koa();
const welcomeAPI = async (ctx: RouterContext, next: any) => {
  ctx.body = {
    msg: "Welcome to the blog API",
  };
  await next();
};
const router: Router = new Router();

router.get('/api/v1', welcomeAPI);
app.use(serve('./docs'));
app.use(cors());
app.use(json());
app.use(logger());
app.use(bodyParser());
app.use(router.routes());
//app.use(articles.routes());
app.use(passport.initialize());
app.use(auth.routes()).use(auth.allowedMethods());
app.use(users.routes()).use(users.allowedMethods());
app.use(special.routes()).use(special.allowedMethods());
app.use(articles.routes()).use(articles.allowedMethods());

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
