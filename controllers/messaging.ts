import { RouterContext } from 'koa-router';
import * as msgModel from '../models/messaging.model';
import { User } from '../models/users.model';
import * as db from '../helpers/database';

interface AuthenticatedUser extends User {
    roles?: string;
}

export const handleCreateThread = async (ctx: RouterContext) => {
    const { subject, initialMessageContent } = ctx.request.body as { subject?: string, initialMessageContent?: string };
    const callingUser = ctx.state.user as AuthenticatedUser;

    if (!initialMessageContent || initialMessageContent.trim() === '') {
        ctx.status = 400;
        ctx.body = { message: "Initial message content is required." };
        return;
    }

    if (!callingUser || !callingUser.id || !callingUser.username) {
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing or incomplete." };
        return;
    }

    try {
        const threadParams: msgModel.CreateThreadParams = {
            userId: callingUser.id,
            userUsername: callingUser.username,
            subject: subject,
            initialMessageContent: initialMessageContent
        };
        const newThread = await msgModel.createThread(threadParams);

        if (newThread) {
            ctx.status = 201;
            ctx.body = newThread;
        } else {
            ctx.status = 500;
            ctx.body = { message: "Failed to create message thread." };
        }
    } catch (error: any) {
        console.error("Error in handleCreateThread:", error);
        ctx.status = 500;
        ctx.body = { message: "An internal error occurred while creating the thread.", error: error.message };
    }
};

export const handleAddMessage = async (ctx: RouterContext) => {
    const threadIdParam = ctx.params.threadId;
    const threadId = parseInt(threadIdParam, 10);

    if (isNaN(threadId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid thread ID parameter." };
        return;
    }

    const { content } = ctx.request.body as { content?: string };
    const callingUser = ctx.state.user as AuthenticatedUser;

    if (!content || content.trim() === '') {
        ctx.status = 400;
        ctx.body = { message: "Message content is required." };
        return;
    }

    if (!callingUser || !callingUser.id || !callingUser.username) {
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing or incomplete." };
        return;
    }

    const senderIsAdmin = !!(callingUser.roles && callingUser.roles.includes('admin'));

    try {
        if (!senderIsAdmin) {
            const threadOwnerQuery = `SELECT user_id FROM message_threads WHERE id = $1;`;
            const threadOwnerRows: any[] = await db.run_query(threadOwnerQuery, [threadId]);
            
            if (!Array.isArray(threadOwnerRows) || threadOwnerRows.length === 0) {
                ctx.status = 404;
                ctx.body = { message: "Thread not found." };
                return;
            }
            
            const threadOwner = threadOwnerRows[0] as { user_id: number };
            if (threadOwner?.user_id !== callingUser.id) {
                ctx.status = 403;
                ctx.body = { message: "You are not authorized to post to this thread." };
                return;
            }
        }

        const messageParams: msgModel.AddMessageParams = {
            threadId: threadId,
            senderId: callingUser.id,
            senderUsername: callingUser.username,
            content: content,
            senderIsAdmin: senderIsAdmin
        };

        const newMessage = await msgModel.addMessageToThread(messageParams);

        if (newMessage) {
            ctx.status = 201;
            ctx.body = newMessage;
        } else {
            ctx.status = 500; 
            ctx.body = { message: "Failed to add message. Thread may not exist or an error occurred." };
        }
    } catch (error: any) {
        console.error(`Error in handleAddMessage (threadId: ${threadId}):`, error);
        if (error.message && error.message.toLowerCase().includes('forbidden')) {
            ctx.status = 403;
            ctx.body = { message: error.message };
        } else {
            ctx.status = 500;
            ctx.body = { message: "An internal error occurred while adding the message.", error: error.message };
        }
    }
};

export const handleGetThreads = async (ctx: RouterContext) => {
    const callingUser = ctx.state.user as AuthenticatedUser;

    if (!callingUser || !callingUser.id) {
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing." };
        return;
    }

    const { limit: limitParam, offset: offsetParam } = ctx.query;
    const limit = limitParam ? parseInt(limitParam as string, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam as string, 10) : 0;

    if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0) {
        ctx.status = 400;
        ctx.body = { message: "Invalid limit or offset parameter." };
        return;
    }
    
    const userIsAdmin = !!(callingUser.roles && callingUser.roles.includes('admin'));

    try {
        let threads: msgModel.MessageThread[] = [];
        if (userIsAdmin) {
            threads = await msgModel.getThreadsForAdmin(limit, offset);
        } else {
            threads = await msgModel.getThreadsForUser(callingUser.id, limit, offset);
        }
        ctx.status = 200;
        ctx.body = threads;
    } catch (error: any) {
        console.error("Error in handleGetThreads:", error);
        ctx.status = 500;
        ctx.body = { message: "An internal error occurred while fetching threads.", error: error.message };
    }
};

export const handleGetMessages = async (ctx: RouterContext) => {
    const threadIdParam = ctx.params.threadId;
    const threadId = parseInt(threadIdParam, 10);

    if (isNaN(threadId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid thread ID parameter." };
        return;
    }

    const callingUser = ctx.state.user as AuthenticatedUser;
    if (!callingUser || !callingUser.id) {
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing." };
        return;
    }

    const userIsAdmin = !!(callingUser.roles && callingUser.roles.includes('admin'));

    try {
        const messages = await msgModel.getMessagesForThread(threadId, callingUser.id, userIsAdmin);
        
        ctx.status = 200;
        ctx.body = messages;

    } catch (error: any) {
        console.error(`Error in handleGetMessages (threadId: ${threadId}):`, error);
        if (error.message && error.message.toLowerCase().includes('forbidden')) {
            ctx.status = 403;
            ctx.body = { message: error.message };
        } else {
            ctx.status = 500;
            ctx.body = { message: "An internal error occurred while fetching messages.", error: error.message };
        }
    }
};

export const handleGetThreadDetails = async (ctx: RouterContext) => {
    const threadIdParam = ctx.params.threadId;
    const threadId = parseInt(threadIdParam, 10);

    if (isNaN(threadId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid thread ID parameter." };
        return;
    }

    const callingUser = ctx.state.user as AuthenticatedUser;
    if (!callingUser || !callingUser.id) {
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing." };
        return;
    }

    const isAdmin = !!(callingUser.roles && callingUser.roles.includes('admin'));

    try {
        const thread = await msgModel.getThreadById(threadId, callingUser.id, isAdmin);

        if (thread) {
            ctx.status = 200;
            ctx.body = thread;
        } else {
            ctx.status = 404;
            ctx.body = { message: `Thread with ID ${threadId} not found or you do not have permission to view it.` };
        }
    } catch (error: any) {
        console.error(`Error in handleGetThreadDetails (threadId: ${threadId}):`, error);
        ctx.status = 500;
        ctx.body = { message: "An internal error occurred while fetching thread details.", error: error.message };
    }
};

export const handleMarkThreadAsRead = async (ctx: RouterContext) => {
    const threadIdParam = ctx.params.threadId;
    const threadId = parseInt(threadIdParam, 10);

    if (isNaN(threadId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid thread ID parameter." };
        return;
    }

    const callingUser = ctx.state.user as AuthenticatedUser;
    if (!callingUser || !callingUser.id) {
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing." };
        return;
    }

    const userIsAdmin = !!(callingUser.roles && callingUser.roles.includes('admin'));
    const readByRole = userIsAdmin ? 'admin' : 'user';

    try {
        const success = await msgModel.markThreadAsRead(threadId, readByRole, callingUser.id);

        if (success) {
            ctx.status = 200; 
            ctx.body = { message: `Thread ${threadId} marked as read by ${readByRole}.` };
        } else {
            ctx.status = 404; 
            ctx.body = { message: `Failed to mark thread ${threadId} as read. It might not exist, you may not be authorized, or it was already in the desired state.` };
        }
    } catch (error: any) {
        console.error(`Error in handleMarkThreadAsRead (threadId: ${threadId}, role: ${readByRole}):`, error);
        ctx.status = 500;
        ctx.body = { message: "An internal error occurred while marking thread as read.", error: error.message };
    }
};

export const handleUpdateThreadStatus = async (ctx: RouterContext) => {
    const threadIdParam = ctx.params.threadId;
    const threadId = parseInt(threadIdParam, 10);

    if (isNaN(threadId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid thread ID parameter." };
        return;
    }

    const { status } = ctx.request.body as { status?: string };

    if (!status || typeof status !== 'string' || status.trim() === '') {
        ctx.status = 400;
        ctx.body = { message: "New status is required and must be a non-empty string." };
        return;
    }

    const callingUser = ctx.state.user as AuthenticatedUser; 
     if (!callingUser || !callingUser.id) { 
        ctx.status = 401;
        ctx.body = { message: "User authentication data is missing." };
        return;
    }

    try {
        const success = await msgModel.updateThreadStatus(threadId, status);

        if (success) {
            ctx.status = 200;
            ctx.body = { message: `Status of thread ${threadId} updated to '${status}'.` };
        } else {
            ctx.status = 404; 
            ctx.body = { message: `Failed to update status for thread ${threadId}. It might not exist or an issue occurred.` };
        }
    } catch (error: any) {
        console.error(`Error in handleUpdateThreadStatus (threadId: ${threadId}, newStatus: ${status}):`, error);
        ctx.status = 500;
        ctx.body = { message: "An internal error occurred while updating thread status.", error: error.message };
    }
};

export const handleDeleteMessageAsAdmin = async (ctx: RouterContext) => {
    const messageIdParam = ctx.params.messageId;
    const messageId = parseInt(messageIdParam, 10);

    if (isNaN(messageId)) {
        ctx.status = 400;
        ctx.body = { message: "Invalid message ID parameter." };
        return;
    }

    try {
        const success = await msgModel.deleteMessageAsAdmin(messageId);

        if (success) {
            ctx.status = 200;
            ctx.body = { message: `Message ${messageId} deleted successfully by admin.` };
        } else {
            ctx.status = 404; 
            ctx.body = { message: `Failed to delete message ${messageId}. It might not exist.` };
        }
    } catch (error: any) {
        console.error(`Error in handleDeleteMessageAsAdmin (messageId: ${messageId}):`, error);
        ctx.status = 500;
        ctx.body = { message: "An internal error occurred while deleting the message.", error: error.message };
    }
}; 