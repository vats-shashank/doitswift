/**
 * Cross-page handoff for smart upload: store file in IndexedDB before navigation,
 * consume on the destination tool page.
 */
(function () {
  var DB_NAME = 'doitswift';
  var STORE = 'kv';
  var KEY = 'pendingUpload';
  var VERSION = 1;

  function openDb() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB_NAME, VERSION);
      r.onupgradeneeded = function () {
        if (!r.result.objectStoreNames.contains(STORE)) {
          r.result.createObjectStore(STORE);
        }
      };
      r.onsuccess = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(r.error);
      };
    });
  }

  window.DoItSwiftPending = {
    store: function (file) {
      if (!file) return Promise.resolve();
      return openDb().then(function (db) {
        return file.arrayBuffer().then(function (buf) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({ buf: buf, name: file.name, type: file.type || '' }, KEY);
            tx.oncomplete = function () {
              resolve();
            };
            tx.onerror = function () {
              reject(tx.error);
            };
          });
        });
      });
    },
    consume: function () {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, 'readonly');
          var req = tx.objectStore(STORE).get(KEY);
          req.onsuccess = function () {
            var v = req.result;
            if (!v) {
              resolve(null);
              return;
            }
            var del = db.transaction(STORE, 'readwrite');
            del.objectStore(STORE).delete(KEY);
            del.oncomplete = function () {
              var file = new File([v.buf], v.name, { type: v.type || 'application/octet-stream' });
              resolve(file);
            };
            del.onerror = function () {
              reject(del.error);
            };
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      });
    },
  };
})();
