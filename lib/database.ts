import mysql, {type Pool,type PoolConnection,type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
type Row=Record<string,any>;type RunResult={meta:{changes:number}};
let pool:Pool|undefined,ready:Promise<void>|undefined;
function getPool(){if(!pool){for(const k of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD'])if(!process.env[k])throw new Error('Database configuration is incomplete.');pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:5,queueLimit:30,charset:'utf8mb4',supportBigNumbers:true,bigNumberStrings:false,connectTimeout:10000,multipleStatements:false,...(process.env.DB_SSL==='true'?{ssl:{rejectUnauthorized:true}}:{})});}return pool;}
const ddl=[
"CREATE TABLE IF NOT EXISTS membership_meta (id INT PRIMARY KEY, schema_version INT NOT NULL) ENGINE=InnoDB",
"INSERT IGNORE INTO membership_meta(id,schema_version) VALUES(1,1)",
"CREATE TABLE IF NOT EXISTS customers (code VARCHAR(80) COLLATE utf8mb4_bin PRIMARY KEY, name VARCHAR(150) NOT NULL, token VARCHAR(144) COLLATE utf8mb4_bin NOT NULL UNIQUE, active TINYINT NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
"CREATE TABLE IF NOT EXISTS invoices (code VARCHAR(80) COLLATE utf8mb4_bin PRIMARY KEY, customer VARCHAR(80) COLLATE utf8mb4_bin NOT NULL, amount BIGINT NOT NULL, points BIGINT NOT NULL, date VARCHAR(32) NOT NULL, imported VARCHAR(32) NOT NULL, INDEX idx_invoice_customer(customer), CONSTRAINT fk_invoice_customer FOREIGN KEY(customer) REFERENCES customers(code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
"CREATE TABLE IF NOT EXISTS settings (\`key\` VARCHAR(80) PRIMARY KEY, value LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
"CREATE TABLE IF NOT EXISTS redemptions (id VARCHAR(80) COLLATE utf8mb4_bin PRIMARY KEY, customer VARCHAR(80) COLLATE utf8mb4_bin NOT NULL, reward VARCHAR(80) NOT NULL, title VARCHAR(150) NOT NULL, points BIGINT NOT NULL, date VARCHAR(32) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', INDEX idx_redemption_customer(customer), INDEX idx_redemption_reward(reward), CONSTRAINT fk_redemption_customer FOREIGN KEY(customer) REFERENCES customers(code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
"CREATE TABLE IF NOT EXISTS imports (id VARCHAR(80) PRIMARY KEY, filename VARCHAR(255) NOT NULL, kind VARCHAR(20) NOT NULL, count INT NOT NULL, date VARCHAR(32) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
,"CREATE TABLE IF NOT EXISTS physical_cards (card_code VARCHAR(40) COLLATE utf8mb4_bin PRIMARY KEY, token VARCHAR(144) COLLATE utf8mb4_bin NOT NULL UNIQUE, customer VARCHAR(80) COLLATE utf8mb4_bin NULL, status VARCHAR(20) NOT NULL DEFAULT 'unassigned', created_at VARCHAR(32) NOT NULL, assigned_at VARCHAR(32) NULL, INDEX idx_card_customer(customer), INDEX idx_card_status(status), CONSTRAINT fk_card_customer FOREIGN KEY(customer) REFERENCES customers(code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
];
async function initialized(){const p=getPool();if(!ready){ready=(async()=>{for(const sql of ddl)await p.query(sql);})().catch(e=>{ready=undefined;throw e});}await ready;return p;}
function dialect(sql:string){return sql.replace(/WHERE key=/g,'WHERE `key`=').replace(/settings\(key,value\)/g,'settings(`key`,value)').replace('ON CONFLICT(key) DO UPDATE SET value=excluded.value','ON DUPLICATE KEY UPDATE value=VALUES(value)').replace('ON CONFLICT(code) DO UPDATE SET name=excluded.name,active=excluded.active','ON DUPLICATE KEY UPDATE name=VALUES(name),active=VALUES(active)').replace('INSERT OR IGNORE INTO','INSERT IGNORE INTO');}
async function transaction<T>(fn:(c:PoolConnection)=>Promise<T>):Promise<T>{const p=await initialized(),c=await p.getConnection();try{await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();await c.query('SELECT id FROM membership_meta WHERE id=1 FOR UPDATE');const out=await fn(c);await c.commit();return out;}catch(e){await c.rollback();throw e}finally{c.release()}}
class Statement{
 constructor(readonly sql:string,readonly values:unknown[]=[]){}
 bind(...values:unknown[]){return new Statement(this.sql,values)}
 async all(){const p=await initialized();const [rows]=await p.query<RowDataPacket[]>(dialect(this.sql),this.values);return {results:rows.map(row=>{const normalized:Row={...row};for(const key of ['total','balance','visits','spent','amount','points','active','count'])if(key in normalized)normalized[key]=Number(normalized[key]);return normalized})}}
 async first<T=Row>():Promise<T|null>{return ((await this.all()).results[0] as T)||null}
 async execute(c:PoolConnection):Promise<RunResult>{const [r]=await c.query<ResultSetHeader>(dialect(this.sql),this.values);return {meta:{changes:r.affectedRows}}}
 async run(){return transaction(c=>this.execute(c))}
}
export const database={prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>transaction(async c=>{const results=[];for(const s of statements)results.push(await s.execute(c));return results})};

