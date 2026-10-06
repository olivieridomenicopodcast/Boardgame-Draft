/**
 * Versione dell'app "stampata" al deploy dalla GitHub Action (tools/stamp-build.mjs
 * sostituisce i segnaposto). In locale restano i segnaposto => "build dev".
 * NON modificare i segnaposto a mano.
 */
const RAW = { build: '__BUILD__', sha: '__SHA__', date: '__BUILD_DATE__' };
const stamped = !RAW.build.startsWith('__');

export const APP_VERSION = {
  stamped,
  build: stamped ? RAW.build : 'dev',
  sha: stamped ? RAW.sha : '',
  date: stamped ? RAW.date : '',
};
