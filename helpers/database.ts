import { Sequelize, QueryTypes } from "sequelize";
import { config } from "../config";

const mainSequelizeInstance = new Sequelize(
  `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
  {
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const initializeDatabase = async () => {
  try {
    await mainSequelizeInstance.authenticate();
    console.log('Database connection has been established successfully for initialization.');

    const createMessageThreadsTable = `
      CREATE TABLE IF NOT EXISTS message_threads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          subject VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) NOT NULL DEFAULT 'open',
          last_message_preview TEXT,
          is_read_by_user BOOLEAN NOT NULL DEFAULT TRUE,
          is_read_by_admin BOOLEAN NOT NULL DEFAULT FALSE
      );
    `;
    const createIdxThreadsUserId = `CREATE INDEX IF NOT EXISTS idx_message_threads_user_id ON message_threads(user_id);`;
    const createIdxThreadsLastMsgAt = `CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at DESC);`;
    const createIdxThreadsStatus = `CREATE INDEX IF NOT EXISTS idx_message_threads_status ON message_threads(status);`;

    const createThreadMessagesTable = `
      CREATE TABLE IF NOT EXISTS thread_messages (
          id SERIAL PRIMARY KEY,
          thread_id INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
          sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          sender_username VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const createIdxMessagesThreadIdCreatedAt = `CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id_created_at ON thread_messages(thread_id, created_at ASC);`;
    const createIdxMessagesSenderId = `CREATE INDEX IF NOT EXISTS idx_thread_messages_sender_id ON thread_messages(sender_id);`;

    await mainSequelizeInstance.query(createMessageThreadsTable);
    await mainSequelizeInstance.query(createIdxThreadsUserId);
    await mainSequelizeInstance.query(createIdxThreadsLastMsgAt);
    await mainSequelizeInstance.query(createIdxThreadsStatus);
    console.log('Checked/Created message_threads table and its indexes.');

    await mainSequelizeInstance.query(createThreadMessagesTable);
    await mainSequelizeInstance.query(createIdxMessagesThreadIdCreatedAt);
    await mainSequelizeInstance.query(createIdxMessagesSenderId);
    console.log('Checked/Created thread_messages table and its indexes.');

  } catch (error) {
    console.error('Unable to initialize database and create tables:', error);
    throw error;
  }
};

export const run_query = async (query: string, values: any[] | { [key: string]: any } ) => {
  const sequelize = new Sequelize(
    `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
    { logging: false }
  );
  try {
    await sequelize.authenticate();
    const data = await sequelize.query(query, {
      bind: values,
      type: QueryTypes.SELECT,
    });
    await sequelize.close();
    return data;
  } catch (err: any) {
    console.error("Error in run_query:", { error: err, query, values });
    throw err;
  }
};

export const run_insert = async (sql: string, values: any[] | { [key: string]: any }) => {
  const sequelize = new Sequelize(
    `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
    { logging: false }
  );
  try {
    await sequelize.authenticate();
    const [results, metadata] = await sequelize.query(sql, {
      bind: values,
      type: QueryTypes.INSERT,
    });
    await sequelize.close();
    return { results, metadata };
  } catch (err: any) {
    console.error("Error in run_insert:", { error: err, sql, values });
    throw err;
  }
};

export const run_update = async (sql: string, values: any[] | { [key: string]: any }) => {
  const sequelize = new Sequelize(
    `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
    { logging: false }
  );
  try {
    await sequelize.authenticate();
    const [results, metadata] = await sequelize.query(sql, {
      bind: values,
    });
    await sequelize.close();
    return metadata;
  } catch (err: any) {
    console.error("Error in run_update:", { error: err, sql, values });
    throw err;
  }
};
