import Router from 'koa-router';
import { basicAuth, verifyLogin, register } from '../controllers/auth';

const router = new Router({ prefix: '/api/v1/auth' });

router.get('/verify', basicAuth, verifyLogin);

router.post('/register', register);

export { router }; 