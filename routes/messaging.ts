import Router from 'koa-router';
import { basicAuth } from '../controllers/auth';
import { isAdmin } from '../controllers/hotels';
import {
    handleCreateThread,
    handleAddMessage,
    handleGetThreads,
    handleGetMessages,
    handleMarkThreadAsRead,
    handleUpdateThreadStatus,
    handleGetThreadDetails,
    handleDeleteMessageAsAdmin
} from '../controllers/messaging';

const router = new Router({ prefix: '/api/v1/messaging' });

router.get('/threads', basicAuth, handleGetThreads);

router.post('/threads', basicAuth, handleCreateThread);

router.get('/threads/:threadId/messages', basicAuth, handleGetMessages);

router.post('/threads/:threadId/messages', basicAuth, handleAddMessage);

router.post('/threads/:threadId/read', basicAuth, handleMarkThreadAsRead);

router.patch('/threads/:threadId/status', basicAuth, isAdmin, handleUpdateThreadStatus);

router.get('/threads/:threadId', basicAuth, handleGetThreadDetails);

router.delete('/messages/:messageId', basicAuth, isAdmin, handleDeleteMessageAsAdmin);

export { router }; 