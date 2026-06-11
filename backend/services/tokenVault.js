/**
 * Token Vault — store Meta access tokens, validate them against the Graph
 * API, and resolve which stored token owns a given ad account so bulk
 * publishes can span accounts from different profiles/Business Managers.
 *
 * Raw tokens never leave the server after being added; clients reference
 * vault entries by UUID (x-fb-token-ids header).
 */

const facebookService = require("./facebookService");
const { FbToken } = require("../models/database");
const logger = require("../utils/logger");

const normalizeActId = (id) => (String(id).startsWith("act_") ? String(id) : `act_${id}`);

const maskToken = (token) =>
  token.length > 12 ? `${token.slice(0, 6)}…${token.slice(-4)}` : "•••";

const toPublic = (rec) => ({
  id: rec.id,
  label: rec.label,
  tokenPreview: maskToken(rec.token),
  fbUserId: rec.fbUserId,
  fbUserName: rec.fbUserName,
  businessId: rec.businessId,
  businessName: rec.businessName,
  status: rec.status,
  lastError: rec.lastError,
  accountCount: rec.accountCount,
  accountIds: rec.accountIds || [],
  lastCheckedAt: rec.lastCheckedAt,
  createdAt: rec.createdAt,
});

/**
 * Hit the Graph API with a raw token: identify the user, pick the business
 * with the most ad accounts (same heuristic as the OAuth flow), and list
 * every ad account the token can reach.
 */
async function inspectToken(token) {
  const me = await facebookService.getMe(token); // throws on invalid token

  let businesses = [];
  try { businesses = await facebookService.getUserBusinesses(token); } catch (_) { /* scope may be missing */ }

  let picked = null;
  if (businesses.length === 1) {
    picked = businesses[0];
  } else if (businesses.length > 1) {
    const counts = await Promise.all(
      businesses.map(b => facebookService.countOwnedAdAccounts(b.id, token))
    );
    let bestIdx = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[bestIdx]) bestIdx = i;
    picked = businesses[bestIdx];
  }

  const accounts = await facebookService.getAllAdAccounts(picked?.id || null, token);

  return {
    fbUserId: me.id || "",
    fbUserName: me.name || "",
    businessId: picked?.id || "",
    businessName: picked?.name || "",
    accounts,
    accountIds: accounts.map(a => normalizeActId(a.id || a.account_id)),
  };
}

/**
 * Validate + store a token. Re-adding a token for the same FB user updates
 * the existing entry instead of creating a duplicate.
 */
async function addToken(token, label = "") {
  const info = await inspectToken(token);

  const existing = info.fbUserId
    ? await FbToken.findOne({ where: { fbUserId: info.fbUserId } })
    : null;

  const fields = {
    token,
    label: label || (existing ? existing.label : info.fbUserName),
    fbUserId: info.fbUserId,
    fbUserName: info.fbUserName,
    businessId: info.businessId,
    businessName: info.businessName,
    status: "valid",
    lastError: "",
    accountIds: info.accountIds,
    accountCount: info.accountIds.length,
    lastCheckedAt: new Date(),
  };

  const rec = existing ? await existing.update(fields) : await FbToken.create(fields);
  logger.info("Vault token added", { user: info.fbUserName, accounts: info.accountIds.length, updated: !!existing });
  return { record: rec, accounts: info.accounts };
}

/** Revalidate a stored token and refresh its account list. */
async function checkToken(rec) {
  try {
    const info = await inspectToken(rec.token);
    await rec.update({
      fbUserId: info.fbUserId,
      fbUserName: info.fbUserName,
      businessId: info.businessId,
      businessName: info.businessName,
      status: "valid",
      lastError: "",
      accountIds: info.accountIds,
      accountCount: info.accountIds.length,
      lastCheckedAt: new Date(),
    });
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    await rec.update({ status: "invalid", lastError: msg, lastCheckedAt: new Date() });
  }
  return rec;
}

/** Resolve a list of vault IDs to full records (invalid/missing IDs dropped silently). */
async function resolveIds(ids) {
  if (!ids || ids.length === 0) return [];
  return FbToken.findAll({ where: { id: ids } });
}

/**
 * Given the vault records a request is allowed to use, find the token that
 * owns an ad account. Falls back to null when no stored token covers it.
 */
function tokenForAccount(records, accountId) {
  const target = normalizeActId(accountId);
  for (const rec of records) {
    if (rec.status === "valid" && (rec.accountIds || []).includes(target)) return rec.token;
  }
  return null;
}

module.exports = { addToken, checkToken, resolveIds, tokenForAccount, toPublic, normalizeActId };
