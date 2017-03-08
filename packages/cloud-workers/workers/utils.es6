import {GmailOAuthHelpers} from 'cloud-core'
import {IMAPConnection} from 'isomorphic-core'

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function asyncGetImapConnection(db, accountId, logger) {
  const account = await db.Account.find({where: {id: accountId}})
  const settings = account.connectionSettings;
  const credentials = account.decryptedCredentials();

  const currentUnixDate = Math.floor(Date.now() / 1000);
  if (account.provider === 'gmail' && currentUnixDate > credentials.expiry_date) {
    logger.info(`Refreshing access token for account id: ${account.id}`);
    await GmailOAuthHelpers.refreshAccessToken(account);
  }

  return new IMAPConnection({
    db: db,
    settings: Object.assign({}, settings, credentials),
    logger: logger,
  });
}
