const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../notification.db');

const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const init = async () => {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS streamers (
            id TEXT PRIMARY KEY,
            name TEXT,
            recent_community_id INTEGER DEFAULT 0,
            recent_live_id INTEGER DEFAULT 0
        )
    `);
    await dbRun(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            channel_id TEXT,
            streamer_id TEXT,
            PRIMARY KEY (channel_id, streamer_id),
            FOREIGN KEY (streamer_id) REFERENCES streamers(id)
        )
    `);
};

const migrateFromJson = async (jsonPath) => {
    if (!fs.existsSync(jsonPath)) return;
    
    try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        for (const channelItem of data) {
            const channelId = channelItem.channel;
            for (const streamer of channelItem.list) {
                // Add streamer if not exists or update info
                await dbRun(`
                    INSERT INTO streamers (id, name, recent_community_id, recent_live_id)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        recent_community_id = MAX(recent_community_id, EXCLUDED.recent_community_id),
                        recent_live_id = MAX(recent_live_id, EXCLUDED.recent_live_id)
                `, [streamer.id, streamer.name, streamer.recentId || 0, streamer.recentLiveId || 0]);

                // Add subscription
                await dbRun(`
                    INSERT OR IGNORE INTO subscriptions (channel_id, streamer_id)
                    VALUES (?, ?)
                `, [channelId, streamer.id]);
            }
        }
        // Backup the json file
        fs.renameSync(jsonPath, jsonPath + '.bak');
        console.log('Migration from JSON successful and notification.json backed up.');
    } catch (err) {
        console.error('Migration error:', err);
    }
};



module.exports = {
    init,
    migrateFromJson,
    dbRun,
    dbGet,
    dbAll,
    // Streamer related
    getAllStreamers: () => dbAll('SELECT * FROM streamers'),
    getStreamer: (id) => dbGet('SELECT * FROM streamers WHERE id = ?', [id]),
    addStreamer: (id, name, communityId, liveId) => 
        dbRun('INSERT OR IGNORE INTO streamers (id, name, recent_community_id, recent_live_id) VALUES (?, ?, ?, ?)', [id, name, communityId, liveId]),
    updateStreamerCommunity: (id, communityId) => 
        dbRun('UPDATE streamers SET recent_community_id = ? WHERE id = ?', [communityId, id]),
    updateStreamerLive: (id, liveId) => 
        dbRun('UPDATE streamers SET recent_live_id = ? WHERE id = ?', [liveId, id]),
    
    // Subscription related
    getSubscriptionsForStreamer: (streamerId) => 
        dbAll('SELECT channel_id FROM subscriptions WHERE streamer_id = ?', [streamerId]),
    getSubscriptionsForChannel: (channelId) => 
        dbAll('SELECT s.*, st.name FROM subscriptions s JOIN streamers st ON s.streamer_id = st.id WHERE s.channel_id = ?', [channelId]),
    addSubscription: (channelId, streamerId) => 
        dbRun('INSERT OR IGNORE INTO subscriptions (channel_id, streamer_id) VALUES (?, ?)', [channelId, streamerId]),
    removeSubscription: (channelId, streamerId) => 
        dbRun('DELETE FROM subscriptions WHERE channel_id = ? AND streamer_id = ?', [channelId, streamerId]),
    getSubscriptionCountForStreamer: (streamerId) =>
        dbGet('SELECT COUNT(*) as count FROM subscriptions WHERE streamer_id = ?', [streamerId]),
    removeStreamerIfNoSubs: async (streamerId) => {
        const result = await dbGet('SELECT COUNT(*) as count FROM subscriptions WHERE streamer_id = ?', [streamerId]);
        if (result.count === 0) {
            await dbRun('DELETE FROM streamers WHERE id = ?', [streamerId]);
        }
    }
};