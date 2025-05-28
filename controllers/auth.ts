import passport from "koa-passport";
import { BasicStrategy } from "passport-http";
import { RouterContext } from "koa-router";
import * as users from '../models/users.model';
import crypto from 'crypto';

interface UserWithSensitiveInfo extends users.User {
    password?: string;
    passwordsalt?: string;
}

const verifyPassword = (userFromDb: UserWithSensitiveInfo, passwordAttempt: string) => {
  if (!userFromDb.password || !userFromDb.passwordsalt) {
    console.error('User object from DB is missing password or passwordsalt');
    return false;
  }
  const hashAttempt = crypto.pbkdf2Sync(passwordAttempt, userFromDb.passwordsalt, 100000, 16, 'sha256').toString('hex');
  return userFromDb.password === hashAttempt;
};

passport.use(new BasicStrategy(async (username, password, done) => {
  let result: UserWithSensitiveInfo[] = [];
  try {
    result = await users.findByUsername(username) as UserWithSensitiveInfo[];
  } catch(error) {
    console.error(`Error during authentication for user ${username}: ${error}`);
    return done(error as Error);
  }
  if(result.length) {
    const user = result[0];
    if(verifyPassword(user, password)) {
      const { password: _p, passwordsalt: _ps, ...secureUser } = user;
      return done(null, secureUser);
    } else {
      console.log(`Password incorrect for ${username}`);
      return done(null, false);
    }
  } else {
    console.log(`No such user ${username}`);
    return done(null, false);
  }
}));

export const basicAuth = async (ctx: RouterContext, next: any) => {
  return passport.authenticate("basic", { session: false }, (err: any, user: any, info: any, status: any) => {
    if (err) {
      ctx.status = 500;
      ctx.body = { message: "Authentication error", error: err.message };
      return;
    }
    if (!user) {
      ctx.status = status || 401;
      ctx.body = { message: (info && typeof info === 'object' && info.message) ? info.message : 'You are not authorized' };
      return;
    }
    ctx.state.user = user;
    return next();
  })(ctx, next);
};

export const register = async (ctx: RouterContext) => {
  const { username, email, password } = ctx.request.body as any;

  if (!username || !email || !password) {
    ctx.status = 400;
    ctx.body = { message: "Username, email, and password are required." };
    return;
  }

  try {
    const existingUser = await users.findByUsername(username);
    if (existingUser && existingUser.length > 0) {
      ctx.status = 409;
      ctx.body = { message: "Username already exists." };
      return;
    }
  } catch (error: any) {
    console.error("Error checking existing username:", error);
    ctx.status = 500;
    ctx.body = { message: "Error during registration.", error: error.message };
    return;
  }

  const salt = crypto.randomBytes(8).toString('hex');
  const hashedPassword = crypto.pbkdf2Sync(password, salt, 100000, 16, 'sha256').toString('hex');

  try {
    const creationResult = await users.createUser({
      username: username,
      email: email,
      passwordhash: hashedPassword,
      passwordsalt: salt
    });

    let userToReturn: UserWithSensitiveInfo | null = null;

    if (Array.isArray(creationResult) && creationResult.length > 0) {
      userToReturn = creationResult[0] as UserWithSensitiveInfo;
    } else if (creationResult && typeof creationResult === 'object' && Reflect.has(creationResult, 'lastID') && Reflect.get(creationResult, 'changes') > 0) {
      userToReturn = { id: Reflect.get(creationResult, 'lastID'), username, email } as UserWithSensitiveInfo;
    } else if (creationResult && typeof creationResult === 'object' && !Array.isArray(creationResult) && Object.keys(creationResult).length > 0){
        userToReturn = creationResult as UserWithSensitiveInfo;
    }

    if (userToReturn) {
      delete userToReturn.password;
      delete userToReturn.passwordsalt;

      ctx.status = 201;
      ctx.body = { message: "User registered successfully", user: userToReturn }; // userToReturn is now clean
    } else {
      console.error("User creation result was not as expected or indicated failure:", creationResult);
      throw new Error("User creation did not return expected user data.");
    }
  } catch (error: any) {
    console.error("Error creating user:", error);
    ctx.status = 500;
    ctx.body = { message: "Error during registration.", error: error.message };
  }
};

export const verifyLogin = async (ctx: RouterContext) => {
  if (ctx.state.user) {
    ctx.status = 200;
    ctx.body = {
      message: "Credentials verified successfully.",
      user: ctx.state.user
    };
  } else {
    console.error('[verifyLogin] ctx.state.user is not set after basicAuth. This should not happen.');
    ctx.status = 401;
    ctx.body = { message: "Verification failed. Credentials may be invalid or an internal error occurred." };
  }
};