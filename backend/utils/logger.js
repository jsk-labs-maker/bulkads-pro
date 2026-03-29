const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[process.env.LOG_LEVEL || "info"];

function log(level, msg, meta = {}) {
  if (levels[level] > currentLevel) return;
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
  const prefix = `[${level.toUpperCase().padEnd(5)}]`;
  console.log(`${ts} ${prefix} ${msg}${metaStr}`);
}

module.exports = {
  error: (msg, meta) => log("error", msg, { service: "bulkads-pro", ...meta }),
  warn: (msg, meta) => log("warn", msg, { service: "bulkads-pro", ...meta }),
  info: (msg, meta) => log("info", msg, { service: "bulkads-pro", ...meta }),
  debug: (msg, meta) => log("debug", msg, { service: "bulkads-pro", ...meta }),
};
