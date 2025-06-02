import * as db from '../helpers/database';
import { User } from './users.model';

export interface MessageThread {
  id: number;
  user_id: number;
  user_username?: string;
  subject?: string | null;
  created_at: string;
  last_message_at: string;
  status: string;
  last_message_preview?: string | null;
  is_read_by_user: boolean;
  is_read_by_admin: boolean;
}

export interface ThreadMessage {
  id: number;
  thread_id: number;
  sender_id: number;
  sender_username: string;
  sender_avatarurl?: string | null;
  content: string;
  created_at: string;
}

export interface CreateThreadParams {
  userId: number;
  userUsername: string;
  subject?: string | null;
  initialMessageContent: string;
}

export interface AddMessageParams {
  threadId: number;
  senderId: number;
  senderUsername: string;
  content: string;
  senderIsAdmin: boolean;
}

const truncatePreview = (text: string, length: number = 50): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export const createThread = async (params: CreateThreadParams): Promise<MessageThread | null> => {
  const { userId, userUsername, subject, initialMessageContent } = params;

  const threadQuery = `
    INSERT INTO message_threads (user_id, subject, created_at, last_message_at, status, is_read_by_user, is_read_by_admin, last_message_preview)
    VALUES ($1, $2, NOW(), NOW(), $3, TRUE, FALSE, $4)
    RETURNING id, user_id, subject, created_at, last_message_at, status, is_read_by_user, is_read_by_admin, last_message_preview;
  `;
  
  const threadInsertResult = await db.run_insert(threadQuery, [
    userId,
    subject || null,
    'open',
    truncatePreview(initialMessageContent)
  ]) as any;

  let newThread: MessageThread | undefined;
  if (threadInsertResult && Array.isArray(threadInsertResult.results) && threadInsertResult.results.length > 0) {
    newThread = threadInsertResult.results[0] as MessageThread;
  } else if (threadInsertResult && typeof threadInsertResult.results === 'object' && threadInsertResult.results !== null && !Array.isArray(threadInsertResult.results)) {
    newThread = threadInsertResult.results as MessageThread;
  } else if (threadInsertResult && typeof threadInsertResult.lastID === 'number' && threadInsertResult.lastID > 0 && threadInsertResult.changes > 0) {
    console.warn('createThread: RETURNING results not in expected array/object format, attempting refetch via lastID');
    return getThreadById(threadInsertResult.lastID, userId, false);
  }
  
  if (!newThread || !newThread.id) {
    console.error("Thread creation failed or did not return expected data from RETURNING clause nor via lastID.", threadInsertResult);
    throw new Error("Thread creation failed to return necessary data.");
  }

  const messageQuery = `
    INSERT INTO thread_messages (thread_id, sender_id, sender_username, content, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id;
  `;
  await db.run_insert(messageQuery, [newThread.id, userId, userUsername, initialMessageContent]);

  if (!newThread.user_username) {
    return getThreadById(newThread.id, userId, false);
  }
  return newThread;
};

export const addMessageToThread = async (params: AddMessageParams): Promise<ThreadMessage | null> => {
  const { threadId, senderId, senderUsername, content, senderIsAdmin } = params;

  const messageQuery = `
    INSERT INTO thread_messages (thread_id, sender_id, sender_username, content, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *;
  `;
  const messageInsertResult = await db.run_insert(messageQuery, [threadId, senderId, senderUsername, content]) as any;

  let newMessage: ThreadMessage | undefined;
  if (messageInsertResult && Array.isArray(messageInsertResult.results) && messageInsertResult.results.length > 0) {
    newMessage = messageInsertResult.results[0] as ThreadMessage;
  } else if (messageInsertResult && typeof messageInsertResult.results === 'object' && messageInsertResult.results !== null && !Array.isArray(messageInsertResult.results)) {
    newMessage = messageInsertResult.results as ThreadMessage;
  }

  if (!newMessage) {
    console.error("Message insertion failed or did not return expected data from RETURNING.", messageInsertResult);
    throw new Error("Message insertion failed to return data.");
  }

  const newStatus = senderIsAdmin ? 'pending_user' : 'pending_admin';
  const readByUser = senderIsAdmin;
  const readByAdmin = !senderIsAdmin;

  const updateThreadQuery = `
    UPDATE message_threads
    SET 
      last_message_at = NOW(),
      last_message_preview = $1,
      status = $2,
      is_read_by_user = $3,
      is_read_by_admin = $4
    WHERE id = $5;
  `;
  await db.run_update(updateThreadQuery, [
    truncatePreview(content),
    newStatus,
    readByUser,
    readByAdmin,
    threadId
  ]);

  return newMessage;
};

export const getThreadsForUser = async (userId: number, limit: number, offset: number): Promise<MessageThread[]> => {
  const query = `
    SELECT 
      t.id, t.user_id, u.username as user_username, t.subject, 
      t.created_at, t.last_message_at, t.status, 
      t.last_message_preview, t.is_read_by_user, t.is_read_by_admin
    FROM message_threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.user_id = $1
    ORDER BY t.last_message_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const result = await db.run_query(query, [userId, limit, offset]) as MessageThread[];
  return result || [];
};

export const getThreadsForAdmin = async (limit: number, offset: number): Promise<MessageThread[]> => {
  const query = `
    SELECT 
      t.id, t.user_id, u.username as user_username, t.subject, 
      t.created_at, t.last_message_at, t.status, 
      t.last_message_preview, t.is_read_by_user, t.is_read_by_admin
    FROM message_threads t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.is_read_by_admin ASC, t.last_message_at DESC
    LIMIT $1 OFFSET $2;
  `;
  const result = await db.run_query(query, [limit, offset]) as MessageThread[];
  return result || [];
};

interface ThreadOwnerRow {
  user_id: number;
}

export const getMessagesForThread = async (threadId: number, userId: number, isAdmin: boolean): Promise<ThreadMessage[]> => {
  const checkOwnershipQuery = `SELECT user_id FROM message_threads WHERE id = $1;`;
  const ownerResult = await db.run_query(checkOwnershipQuery, [threadId]) as ThreadOwnerRow[];

  if (!ownerResult || ownerResult.length === 0) {
    console.warn(`getMessagesForThread: Thread ${threadId} not found.`);
    return [];
  }

  if (!isAdmin && ownerResult[0]?.user_id !== userId) {
    console.warn(`getMessagesForThread: User ${userId} does not own thread ${threadId}.`);
    throw new Error('Forbidden: You do not have access to this thread.');
  }

  const query = `
    SELECT 
      tm.id, tm.thread_id, tm.sender_id, tm.sender_username, tm.content, tm.created_at,
      u.avatarurl as sender_avatarurl
    FROM thread_messages tm
    LEFT JOIN users u ON tm.sender_id = u.id
    WHERE tm.thread_id = $1
    ORDER BY tm.created_at ASC;
  `;
  const result = await db.run_query(query, [threadId]) as ThreadMessage[];
  return result || [];
};

interface ThreadReadStatusRow {
  user_id: number;
  is_read_by_user: boolean;
  is_read_by_admin: boolean;
}

interface UpdateResult {
  rowCount: number;
}

export const markThreadAsRead = async (threadId: number, role: 'user' | 'admin', userIdForAuth: number): Promise<boolean> => {
  const threadCheckQuery = `SELECT user_id, is_read_by_user, is_read_by_admin FROM message_threads WHERE id = $1;`;
  const threadCheckResult = await db.run_query(threadCheckQuery, [threadId]) as ThreadReadStatusRow[];

  if (threadCheckResult.length === 0) {
    console.warn(`markThreadAsRead: Thread ${threadId} not found.`);
    return false;
  }

  const thread = threadCheckResult[0];

  if (role === 'user' && thread.user_id !== userIdForAuth) {
    console.warn(`markThreadAsRead: User ${userIdForAuth} unauthorized to mark thread ${threadId} as read by user.`);
    return false; 
  }

  let query = '';
  let alreadySet = false;
  if (role === 'user') {
    query = `UPDATE message_threads SET is_read_by_user = TRUE WHERE id = $1 AND is_read_by_user = FALSE;`;
    alreadySet = thread.is_read_by_user;
  } else {
    query = `UPDATE message_threads SET is_read_by_admin = TRUE WHERE id = $1 AND is_read_by_admin = FALSE;`;
    alreadySet = thread.is_read_by_admin;
  }
  
  if(alreadySet){
    return true;
  }

  const updateResult = await db.run_update(query, [threadId]) as UpdateResult;
  return updateResult.rowCount > 0;
};

export const updateThreadStatus = async (threadId: number, status: string): Promise<boolean> => {
  const query = `UPDATE message_threads SET status = $1 WHERE id = $2;`;
  const result = await db.run_update(query, [status, threadId]) as UpdateResult;
  return result.rowCount > 0;
};

export const getThreadById = async (threadId: number, userId: number, isAdmin: boolean): Promise<MessageThread | null> => {
  const query = `
    SELECT 
      t.id, t.user_id, u.username as user_username, t.subject, 
      t.created_at, t.last_message_at, t.status, 
      t.last_message_preview, t.is_read_by_user, t.is_read_by_admin
    FROM message_threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = $1;
  `;
  const resultRows = await db.run_query(query, [threadId]) as MessageThread[];

  if (!resultRows || resultRows.length === 0) {
    return null;
  }

  const thread = resultRows[0];

  if (!isAdmin && thread.user_id !== userId) {
    console.warn(`getThreadById: User ${userId} is not authorized to access thread ${threadId}.`);
    return null;
  }

  return thread;
};

export const deleteMessageAsAdmin = async (messageId: number): Promise<boolean> => {
  const query = `DELETE FROM thread_messages WHERE id = $1;`;
  const result = await db.run_update(query, [messageId]) as { rowCount: number }; 
  return result && result.rowCount > 0;
}; 