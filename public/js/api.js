"use strict";


// Initialize private variables

let _database = null;
let _subscriptions = [];

let _akey = null;
let _ukey = null;
let _skey = null;
let _peers = {};
let _handler = null;

const _pconfig = null;
const _channoptions = {
    ordered: true,
    reliable: true
};

// Public API functions related to API initialization

function initApi(akey) {
    _akey = akey;
    _database = firebase.database();
}


// Public API functions related to user management

function createUser(data) {
    return new Promise(function (resolve, reject) {
        const ukey = _database.ref().child("users").push().key;
        _ukey = ukey;
        const refkey = `users/${ukey}`;
        _database.ref(refkey).update({data: data}).then(
            function () {
                let user = _newUser(ukey, data);
                resolve(user);
            },
            function () {
                reject(null);
            }
        );
    });
}

function updateUser(data) {
    return new Promise(function (resolve, reject) {
        const refkey = `users/${_ukey}`;
        _database.ref(refkey).update({data: data}).then(
            function () {
                let user = _newUser(ukey, data);
                resolve(user);
            },
            function () {
                reject(null);
            }
        );
    });
}

function setUser(ukey) {
    return new Promise(function (resolve, reject) {
        const refkey = `users/${ukey}`;
        _ukey = ukey;
        const ref = _database.ref(refkey);
        ref.on(
            "value",
            function (snapshot) {
                const data = snapshot.val();
                const user = _newUser(ukey, data.data);
                resolve(user);
            },
            function () {
                reject(null);
            }
        );
        _subscriptions.push(ref);
    });
}

function listUsers() {
    return new Promise(function (resolve, reject) {
        const refkey = "users";
        const ref = _database.ref(refkey);
        ref.on(
            "value",
            function (snapshot) {
                const data = snapshot.val();
                const users = [];
                for (let ukey in data) {
                    let u = data[ukey];
                    let user = _newUser(ukey, u.data);
                    users.push(user);
                }
                resolve(users);
            },
            function () {
                reject(null);
            }
        );
        _subscriptions.push(ref);
    });
}

function deleteUser(ukey) {
    return new Promise(function (resolve, reject) {
        const refkey = `users/${ukey}`;
        _database.ref(refkey).remove().then(
            function () {
                resolve(true);
            },
            function () {
                reject(false);
            }
        );
    });
}


// Public API functions related to session management

function createSession(data) {
    return new Promise(function (resolve, reject) {
        const skey = _database.ref(_akey).child("sessions").push().key;
        const refkey = `${_akey}/sessions/${skey}`;
        _database.ref(refkey).update({data: data}).then(
            function () {
                let session = _newSession(skey, data);
                resolve(session);
            },
            function () {
                reject(null);
            }
        );
    });
}

function updateSession(data) {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${_skey}`;
        _database.ref(refkey).update({data: data}).then(
            function () {
                let session = _newSession(skey, data);
                resolve(session);
            },
            function () {
                reject(null);
            }
        );
    });
}

function joinSession(skey) {
    return new Promise(function (resolve, reject) {
        let refkey = `${_akey}/sessions/${skey}/participants/${_ukey}`;
        _skey = skey;
        let joined = false;
        _database.ref(refkey).update({id: _ukey, offers: [], answers: [], candidates: []}).then(
            function () {
                refkey = `${_akey}/sessions/${skey}/participants`;
                const ref = _database.ref(refkey);
                ref.on(
                    "value",
                    function (snapshot) {
                        const data = snapshot.val();
                        const pkeys = [];
                        for (let pkey in data) {
                            if (pkey !== _ukey) {
                                pkeys.push(pkey);
                            }
                        }
                        _updatePeers(pkeys);

                        if (!joined) {
                            _createOffers();
                            _listenAnswers();
                            joined = true;
                            resolve(true);
                        }
                    }
                );
                _subscriptions.push(ref);

                _listenOffers();
                _listenCandidates();
            },
            function () {
                reject(false);
            }
        );
    });
}

function listSessions() {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions`;
        const ref = _database.ref(refkey);
        ref.on(
            "value",
            function (snapshot) {
                const data = snapshot.val();
                const sessions = [];
                for (let key in data) {
                    let s = data[key];
                    let session = _newSession(key, s.data);
                    sessions.push(session);
                }
                resolve(sessions);
            },
            function () {
                reject(null);
            }
        );
        _subscriptions.push(ref);
    });
}

function leaveSession() {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${_skey}/participants/${_ukey}`;
        _database.ref(refkey).remove().then(
            function () {
                _skey = null;
                _peers = {};
                for (let s of _subscriptions) {
                    s.off();
                }
                _subscriptions = [];
                resolve(true);
            },
            function () {
                reject(false);
            }
        );
    });
}

function deleteSession(skey) {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${skey}`;
        _database.ref(refkey).remove().then(
            function () {
                resolve(true);
            },
            function () {
                reject(false);
            }
        );
    });
}


// Public API functions for transmitting and receiving data

function listPeers() {
    return new Promise(function (resolve, reject) {
        const refkey = `users`;
        const ref = _database.ref(refkey);
        ref.on(
            "value",
            function (snapshot) {
                const data = snapshot.val();
                const peers = [];
                for (let pkey in data) {
                    if (pkey in _peers) {
                        let peer = data[pkey];
                        let user = _newUser(pkey, peer.data);
                        peers.push(user);
                    }
                }
                resolve(peers);
            },
            function () {
                reject(null);
            }
        );
        _subscriptions.push(ref);
    });
}

function messageAll(data) {
    const message = _encodeObject(data);
    for (let pkey in _peers) {
        let p = _peers[pkey];
        if (p.connected && p.opened) {
            p.chann.send(message);
        }
    }
}

function messagePeer(pkey, data) {
    const message = _encodeObject(data);
    const p = _peers[pkey];
    if (p.connected && p.opened) {
        p.chann.send(message);
    }
}

function messageHandler(handler) {
    _handler = handler;

    for (let pkey in _peers) {
        let p = _peers[pkey];
        if (p.connected && p.opened) {
            p.chann.onmessage = _handleMessage;
        }
    }
}


// Public API functions for manipulating database models

function createKey(mpath) {
    const refkey = `${_akey}/sessions/${_skey}/data`;
    const ref = _database.ref(refkey);
    return ref.child(mpath).push().key;
}

function createModel(mpath, data) {
    const refkey = `${_akey}/sessions/${_skey}/data${mpath}`;
    return _database.ref(refkey).set(data);
}

function updateModel(mpath, data) {
    const refkey = `${_akey}/sessions/${_skey}/data${mpath}`;
    return _database.ref(refkey).update(data);
}

function getModel(mpath) {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${_skey}/data${mpath}`;
        _database.ref(refkey).once(
            "value",
            function (snapshot) {
                const data = snapshot.val();
                resolve(data);
            },
            function () {
                reject(null);
            }
        );
    });
}

function listenModel(mpath, success, failure) {
    const refkey = `${_akey}/sessions/${_skey}/data${mpath}`;
    const ref = _database.ref(refkey);
    ref.on(
        "value",
        function (snapshot) {
            const data = snapshot.val();
            success(data);
        },
        function (error) {
            failure(error);
        }
    );
    _subscriptions.push(ref);
}

function deleteModel(mpath) {
    const refkey = `${_akey}/sessions/${_skey}/data${mpath}`;
    return _database.ref(refkey).remove();
}


// Public API functions for versioning of data

function createVersion(data) {
    return new Promise(function (resolve, reject) {
        const vkey = _database.ref(`${_akey}/sessions/${_skey}`).child("versions").push().key;
        const refkey = `${_akey}/sessions/${_skey}/data`;
        _database.ref(refkey).once("value").then(
            function (snapshot) {
                data["data"] = snapshot.val();

                const vpath = `${_akey}/sessions/${_skey}/versions/${vkey}`;
                _database.ref(vpath).update({data: data}).then(
                    function () {
                        let version = _newVersion(_skey, vkey, data);
                        resolve(version);
                    },
                    function () {
                        reject(null);
                    }
                );
            }
        );
    });
}

function restoreVersion(vkey) {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${_skey}/versions/${vkey}/data`;
        _database.ref(refkey).once("value").then(
            function (snapshot) {
                const refkey = `${_akey}/sessions/${_skey}/data`;
                const data = snapshot.val();
                _database.ref(refkey).update(data.data).then(
                    function () {
                        resolve(true);
                    },
                    function () {
                        reject(false);
                    }
                );
            }
        );
    });
}

function listVersions() {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${_skey}/versions`;
        const ref = _database.ref(refkey);
        ref.on(
            "value",
            function (snapshot) {
                const data = snapshot.val();
                const versions = [];
                for (let vkey in data) {
                    let v = data[vkey];
                    let version = _newVersion(_skey, vkey, v.data);
                    versions.push(version);
                }
                resolve(versions);
            },
            function () {
                reject(null);
            }
        );
        _subscriptions.push(ref);
    });
}

function deleteVersion(vkey) {
    return new Promise(function (resolve, reject) {
        const refkey = `${_akey}/sessions/${_skey}/versions/${vkey}`;
        _database.ref(refkey).remove().then(
            function () {
                resolve(true);
            },
            function () {
                reject(false);
            }
        );
    });
}


// Public API functions for manipulating cookies

function setCookie(ckey, value, expiry) {
    _setCookie(ckey, value, expiry);
}

function extractCookie(ckey) {
    return _extractCookie(ckey);
}


// Private API functions for the above public functions

function _updatePeers(pkeys) {
    for (let pkey in _peers) {
        _peers[pkey].alive = false;
    }
    for (let pkey of pkeys) {
        if (!!_peers[pkey]) {
            _peers[pkey].alive = true;
        } else {
            _peers[pkey] = _newParticipant(pkey);
        }
    }

    const peers = {};
    for (let pkey in _peers) {
        if (_peers[pkey].alive) {
            peers[pkey] = _peers[pkey];
        } else {
            _peers[pkey].connected = false;
            _peers[pkey].opened = false;
            _peers[pkey].conn.close();
            _peers[pkey].chann.close();
        }
    }
    _peers = peers;
}

function _createOffers() {
    for (let pkey in _peers) {
        let p = _peers[pkey];
        _sendCandidates(p);
        _openChannel(p, true);

        p.conn.createOffer().then(
            (offer) => _setLocalDescription(p, offer)
        ).then(
            () => _sendOffer(p)
        );
    }
}

function _sendOffer(p) {
    const refkey = `${_akey}/sessions/${_skey}/participants/${p.pkey}/offers/${_ukey}`;
    _database.ref(refkey).update({offer: _encodeObject(p.conn.localDescription)});
}

function _listenOffers() {
    const refkey = `${_akey}/sessions/${_skey}/participants/${_ukey}/offers`;
    const ref = _database.ref(refkey);
    ref.on(
        "value",
        function (snapshot) {
            const data = snapshot.val();
            for (let pkey in data) {
                let p = _peers[pkey];
                p.connected = true;
                _sendCandidates(p);
                _openChannel(p, false);

                _setRemoteDescription(p, data[pkey].offer, true).then(
                    () => _removeObject(`${refkey}/${pkey}`)
                ).then(
                    () => _createAnswer(p)
                );
            }
        }
    );
    _subscriptions.push(ref);
}

function _createAnswer(p) {
    p.conn.createAnswer().then(
        (answer) => _setLocalDescription(p, answer)
    ).then(
        () => _sendAnswer(p)
    );
}

function _sendAnswer(p) {
    const refkey = `${_akey}/sessions/${_skey}/participants/${p.pkey}/answers/${_ukey}`;
    _database.ref(refkey).update({answer: _encodeObject(p.conn.localDescription)});
}

function _listenAnswers() {
    const refkey = `${_akey}/sessions/${_skey}/participants/${_ukey}/answers`;
    const ref = _database.ref(refkey);
    ref.on(
        "value",
        function (snapshot) {
            const data = snapshot.val();
            for (let pkey in data) {
                let p = _peers[pkey];
                if (!p.connected) {
                    p.connected = true;
                    _setRemoteDescription(p, data[pkey].answer, true).then(
                        () => _removeObject(`${refkey}/${pkey}`)
                    );
                }
            }
        }
    );
    _subscriptions.push(ref);
}

function _sendCandidates(p) {
    const refkey = `${_akey}/sessions/${_skey}/participants/${p.pkey}/candidates/${_ukey}`;
    p.conn.onicecandidate = function (event) {
        if (event.candidate) {
            _database.ref(refkey).update({candidate: _encodeObject(event.candidate.candidate)});
        }
    }
}

function _listenCandidates() {
    const refkey = `${_akey}/sessions/${_skey}/participants/${_ukey}/candidates`;
    const ref = _database.ref(refkey);
    ref.on(
        "value",
        function (snapshot) {
            const data = snapshot.val();
            for (let pkey in data) {
                let p = _peers[pkey];
                p.conn.addIceCandidate(
                    new RTCIceCandidate({
                        candidate: _decodeObject(data[pkey].candidate)
                    })
                ).then(
                    () => _removeObject(`${refkey}/${pkey}`)
                );
            }
        }
    );
    _subscriptions.push(ref);
}

function _openChannel(p, initiator) {
    if (initiator) {
        p.chann = p.conn.createDataChannel("channel", _channoptions);
        p.chann.onopen = function () {
            p.opened = true;
            p.chann.onmessage = _handleMessage;
        }
    } else {
        p.conn.ondatachannel = function (event) {
            p.opened = true;
            p.chann = event.channel;
            p.chann.onmessage = _handleMessage;
        }
    }
}

function _handleMessage(message) {
    if (_handler) {
        _handler(_decodeObject(message.data));
    }
}

function _removeObject(refkey) {
    return new Promise(function (resolve, reject) {
        _database.ref(refkey).remove().then(
            () => resolve(true)
        ).catch(
            () => reject(false)
        );
    });
}


// Private entity functions

function _newUser(ukey, data) {
    return {
        id: ukey,
        data: data,
        path: `users/${ukey}`
    };
}

function _newSession(skey, data) {
    return {
        id: skey,
        data: data,
        path: `${_akey}/sessions/${skey}/data`
    };
}

function _newVersion(skey, vkey, data) {
    return {
        id: vkey,
        data: data,
        path: `${_akey}/sessions/${skey}/versions/${vkey}`
    };
}

function _newParticipant(pkey) {
    return {
        conn: new RTCPeerConnection(_pconfig),
        chann: null,
        pkey: pkey,
        connected: false,
        opened: false,
        alive: true
    };
}

function _setLocalDescription(p, d) {
    const description = new RTCSessionDescription(d);
    return p.conn.setLocalDescription(description);
}

function _setRemoteDescription(p, d, parse) {
    const description = parse
        ? new RTCSessionDescription(_decodeObject(d))
        : new RTCSessionDescription(d);
    return p.conn.setRemoteDescription(description);
}

function _setCookie(ckey, value, expiry) {
    let cookie = `${ckey}=${value};`;
    if (expiry) {
        cookie = `${cookie}expires=${expiry.toString()};`
    }
    document.cookie = cookie;
}

function _extractCookie(ckey) {
    const cookies = document.cookie.split(";");
    for (let cookie in cookies) {
        if (cookie.startsWith(`${ckey}=`)) {
            return cookie.split("=")[1];
        }
    }
    return null;
}

function _decodeObject(description) {
    return JSON.parse(description);
}

function _encodeObject(description) {
    return JSON.stringify(description);
}

