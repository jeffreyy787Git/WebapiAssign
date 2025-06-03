import { Sequelize, QueryTypes } from "sequelize";
import { config } from "../config";

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
