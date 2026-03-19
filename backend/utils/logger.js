const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[process.env.LOG_LEVEL || "debug"];
const log = (level, msg, meta = {}) => {
  if (levels[level] > currentLevel) return;
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
  console.log(ts + " [" + level + "]: " + msg + metaStr);
};
module.exports = {
  error: (m, meta) => log("error", m, { service: "bulkads-pro", ...meta }),
  warn: (m, meta) => log("warn", m, { service: "bulkads-pro", ...meta }),
  info: (m, meta) => log("info", m, { service: "bulkads-pro", ...meta }),
  debug: (m, meta) => log("debug", m, meta),
};
