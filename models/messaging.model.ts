import * as db from '../helpers/database';

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
  
  const threadInsertResult: any = await db.run_insert(threadQuery, [
    userId,
    subject || null,
    'open',
    truncatePreview(initialMessageContent)
  ]);

  let newThread: MessageThread | undefined;
  if (threadInsertResult && Array.isArray(threadInsertResult.results) && threadInsertResult.results.length > 0) {
    newThread = threadInsertResult.results[0] as MessageThread;
  } else if (threadInsertResult && typeof threadInsertResult.results === 'object' && threadInsertResult.results !== null && !Array.isArray(threadInsertResult.results)) {
    newThread = threadInsertResult.results as MessageThread;
  } else if (Array.isArray(threadInsertResult) && threadInsertResult.length > 0) {
    newThread = threadInsertResult[0] as MessageThread;
  } else if (threadInsertResult && typeof threadInsertResult.lastID === 'number' && threadInsertResult.lastID > 0 && 
             (typeof threadInsertResult.changes === 'number' && threadInsertResult.changes > 0 || typeof threadInsertResult.rowCount === 'number' && threadInsertResult.rowCount > 0) ) {
    console.warn('createThread: RETURNING data not in expected primary structures, attempting refetch via lastID based on metadata.');
    return getThreadById(threadInsertResult.lastID, userId, false);
  }
  
  if (!newThread || typeof newThread.id !== 'number') {
    console.error("Thread creation failed or did not return expected data (id missing or invalid). Result:", threadInsertResult);
    return null; 
  }

  const messageQuery = `
    INSERT INTO thread_messages (thread_id, sender_id, sender_username, content, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id;
  `;
  const initialMessageInsertResult: any = await db.run_insert(messageQuery, [newThread.id, userId, userUsername, initialMessageContent]);
  if (!initialMessageInsertResult || 
      !( (Array.isArray(initialMessageInsertResult.results) && initialMessageInsertResult.results.length > 0) || 
         (Array.isArray(initialMessageInsertResult) && initialMessageInsertResult.length > 0) || 
         (initialMessageInsertResult.lastID > 0 && (initialMessageInsertResult.changes > 0 || initialMessageInsertResult.rowCount > 0)) ||
         (typeof initialMessageInsertResult.rowCount === 'number' && initialMessageInsertResult.rowCount > 0) )) {
      console.warn("Initial message for new thread may not have been saved, or insert result was not confirmative. Thread ID:", newThread.id);
  }

  if (!newThread.user_username) {
    newThread.user_username = userUsername;
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
  const messageInsertResult: any = await db.run_insert(messageQuery, [threadId, senderId, senderUsername, content]);

  let newMessage: ThreadMessage | undefined;
  if (messageInsertResult && Array.isArray(messageInsertResult.results) && messageInsertResult.results.length > 0) {
    newMessage = messageInsertResult.results[0] as ThreadMessage;
  } else if (Array.isArray(messageInsertResult) && messageInsertResult.length > 0) {
    newMessage = messageInsertResult[0] as ThreadMessage;
  } else if (messageInsertResult && typeof messageInsertResult === 'object' && !Array.isArray(messageInsertResult) && messageInsertResult.id) {
    newMessage = messageInsertResult as ThreadMessage;
  }

  if (!newMessage) {
    console.error("Message insertion failed or did not return expected data from RETURNING. Result:", messageInsertResult);
    return null;
  }

  const newStatus = senderIsAdmin ? 'pending_user' : 'pending_admin';
  const readByUserUpdate = senderIsAdmin;
  const readByAdminUpdate = !senderIsAdmin;

  const updateThreadQuery = `
    UPDATE message_threads
    SET 
      last_message_at = NOW(),
      last_message_preview = $1,
      status = $2,
      is_read_by_user = CASE WHEN $3 = TRUE THEN TRUE ELSE is_read_by_user END,
      is_read_by_admin = CASE WHEN $4 = TRUE THEN TRUE ELSE is_read_by_admin END
    WHERE id = $5;
  `;
  
  const finalUpdateThreadQuery = `
    UPDATE message_threads
    SET 
      last_message_at = NOW(),
      last_message_preview = $1,
      status = $2,
      is_read_by_user = $3,
      is_read_by_admin = $4
    WHERE id = $5;
  `;

  const newReadByUser = !senderIsAdmin; 
  const newReadByAdmin = senderIsAdmin;

  await db.run_update(finalUpdateThreadQuery, [
    truncatePreview(content),
    newStatus,
    newReadByUser, 
    newReadByAdmin,
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
  const result: any = await db.run_query(query, [userId, limit, offset]);
  return (Array.isArray(result) ? result : (result && Array.isArray(result.rows) ? result.rows : [])) as MessageThread[];
};

export const getThreadsForAdmin = async (limit: number, offset: number): Promise<MessageThread[]> => {
  const query = `
    SELECT 
      t.id, t.user_id, u.username as user_username, t.subject, 
      t.created_at, t.last_message_at, t.status, 
      t.last_message_preview, t.is_read_by_user, t.is_read_by_admin
    FROM message_threads t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.is_read_by_admin ASC, t.status ASC, t.last_message_at DESC -- Prioritize unread by admin, then by status, then by time
    LIMIT $1 OFFSET $2;
  `;
  const result: any = await db.run_query(query, [limit, offset]);
  return (Array.isArray(result) ? result : (result && Array.isArray(result.rows) ? result.rows : [])) as MessageThread[];
};

interface ThreadOwnerRow {
  user_id: number;
}

export const getMessagesForThread = async (threadId: number, userId: number, isAdmin: boolean): Promise<ThreadMessage[]> => {
  const checkOwnershipQuery = `SELECT user_id FROM message_threads WHERE id = $1;`;
  const ownerResult: any = await db.run_query(checkOwnershipQuery, [threadId]);
  const ownerRows = Array.isArray(ownerResult) ? ownerResult : (ownerResult && Array.isArray(ownerResult.rows) ? ownerResult.rows : []);

  if (!ownerRows || ownerRows.length === 0) {
    console.warn(`getMessagesForThread: Thread ${threadId} not found.`);
    return [];
  }

  const threadOwner: ThreadOwnerRow = ownerRows[0];
  if (!isAdmin && threadOwner.user_id !== userId) {
    console.warn(`getMessagesForThread: User ${userId} does not own thread ${threadId}. Access denied.`);
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
  const messagesResult: any = await db.run_query(query, [threadId]);
  return (Array.isArray(messagesResult) ? messagesResult : (messagesResult && Array.isArray(messagesResult.rows) ? messagesResult.rows : [])) as ThreadMessage[];
};

interface ThreadReadStatusRow {
  user_id: number;
  is_read_by_user: boolean;
  is_read_by_admin: boolean;
}

interface UpdateResultMetadata {
  changes?: number;
  rowCount?: number;
  lastID?: any;
}

export const markThreadAsRead = async (threadId: number, role: 'user' | 'admin', userIdForAuth: number): Promise<boolean> => {
  const threadCheckQuery = `SELECT user_id, is_read_by_user, is_read_by_admin FROM message_threads WHERE id = $1;`;
  const threadCheckResult: any = await db.run_query(threadCheckQuery, [threadId]);
  const threadCheckRows = Array.isArray(threadCheckResult) ? threadCheckResult : (threadCheckResult && Array.isArray(threadCheckResult.rows) ? threadCheckResult.rows : []);

  if (threadCheckRows.length === 0) {
    console.warn(`markThreadAsRead: Thread ${threadId} not found.`);
    return false;
  }

  const thread: ThreadReadStatusRow = threadCheckRows[0];

  if (role === 'user' && thread.user_id !== userIdForAuth) {
    console.warn(`markThreadAsRead: User ${userIdForAuth} unauthorized to mark thread ${threadId} as read by user. This action is forbidden.`);
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

  const updateResult: any = await db.run_update(query, [threadId]);
  const success = (updateResult && (typeof updateResult.rowCount === 'number' && updateResult.rowCount > 0)) ||
                  (updateResult && (typeof updateResult.changes === 'number' && updateResult.changes > 0)) ||
                  (Array.isArray(updateResult) && updateResult.length > 0) || 
                  (updateResult && Array.isArray(updateResult.results) && updateResult.results.length > 0);
  return !!success;
};

export const updateThreadStatus = async (threadId: number, status: string): Promise<boolean> => {
  const query = `UPDATE message_threads SET status = $1 WHERE id = $2;`;
  const result: any = await db.run_update(query, [status, threadId]);
  const success = (result && (typeof result.rowCount === 'number' && result.rowCount > 0)) ||
                  (result && (typeof result.changes === 'number' && result.changes > 0)) ||
                  (Array.isArray(result) && result.length > 0) || 
                  (result && Array.isArray(result.results) && result.results.length > 0);
  return !!success;
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
  const resultRows: any = await db.run_query(query, [threadId]);
  const rows = Array.isArray(resultRows) ? resultRows : (resultRows && Array.isArray(resultRows.rows) ? resultRows.rows : []);


  if (!rows || rows.length === 0) {
    return null;
  }

  const thread: MessageThread = rows[0] as MessageThread;

  if (!isAdmin && thread.user_id !== userId) {
    console.warn(`getThreadById: User ${userId} is not authorized to access thread ${threadId}. Access denied.`);
    return null;
  }

  return thread;
};

export const deleteMessageAsAdmin = async (messageId: number): Promise<boolean> => {
  const query = `DELETE FROM thread_messages WHERE id = $1;`;
  const result: any = await db.run_update(query, [messageId]); 
  const success = (result && (typeof result.rowCount === 'number' && result.rowCount > 0)) ||
                  (result && (typeof result.changes === 'number' && result.changes > 0));
  return !!success;
}; 