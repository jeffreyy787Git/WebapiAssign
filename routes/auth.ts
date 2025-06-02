import Router from 'koa-router';
import { basicAuth, verifyLogin, register, updateAvatar } from '../controllers/auth';

const router = new Router({ prefix: '/api/v1/auth' });

router.get('/verify', basicAuth, verifyLogin);

router.post('/register', register);

router.put('/me/avatar', basicAuth, updateAvatar);

export { router }; 