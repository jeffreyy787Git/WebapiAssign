import Router from 'koa-router';
import { basicAuth, verifyLogin } from '../controllers/auth';

const router = new Router({ prefix: '/api/v1/auth' });

router.get('/verify', basicAuth, verifyLogin);

export { router }; 