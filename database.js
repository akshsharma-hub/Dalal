const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'data');
        this.statsFile = path.join(this.dbPath, 'stats.json');
        this.configFile = path.join(this.dbPath, 'config.json');
        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath);
        }

        // Initialize files
        this.initializeFiles();
    }

    initializeFiles() {
        // Initialize stats file
        if (!fs.existsSync(this.statsFile)) {
            fs.writeFileSync(this.statsFile, JSON.stringify({}));
        }

        // Initialize config file
        if (!fs.existsSync(this.configFile)) {
            fs.writeFileSync(this.configFile, JSON.stringify({}));
        }
    }

    readStats() {
        try {
            const data = fs.readFileSync(this.statsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    writeStats(data) {
        fs.writeFileSync(this.statsFile, JSON.stringify(data, null, 2));
    }

    readConfig() {
        try {
            const data = fs.readFileSync(this.configFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    writeConfig(data) {
        fs.writeFileSync(this.configFile, JSON.stringify(data, null, 2));
    }

    getStats(guildId) {
        const stats = this.readStats();
        const today = new Date().toDateString();

        if (!stats[guildId]) {
            stats[guildId] = {
                todayMessages: 0,
                todayJoins: 0,
                lastReset: today
            };
            this.writeStats(stats);
        }

        // Reset daily stats if it's a new day
        if (stats[guildId].lastReset !== today) {
            stats[guildId].todayMessages = 0;
            stats[guildId].todayJoins = 0;
            stats[guildId].lastReset = today;
            this.writeStats(stats);
        }

        return stats[guildId];
    }

    incrementMessageCount(guildId) {
        const stats = this.readStats();
        const today = new Date().toDateString();

        if (!stats[guildId]) {
            stats[guildId] = {
                todayMessages: 0,
                todayJoins: 0,
                lastReset: today
            };
        }

        // Reset if new day
        if (stats[guildId].lastReset !== today) {
            stats[guildId].todayMessages = 0;
            stats[guildId].todayJoins = 0;
            stats[guildId].lastReset = today;
        }

        stats[guildId].todayMessages++;
        this.writeStats(stats);
    }

    incrementJoinCount(guildId) {
        const stats = this.readStats();
        const today = new Date().toDateString();

        if (!stats[guildId]) {
            stats[guildId] = {
                todayMessages: 0,
                todayJoins: 0,
                lastReset: today
            };
        }

        // Reset if new day
        if (stats[guildId].lastReset !== today) {
            stats[guildId].todayMessages = 0;
            stats[guildId].todayJoins = 0;
            stats[guildId].lastReset = today;
        }

        stats[guildId].todayJoins++;
        this.writeStats(stats);
    }

    setLogChannel(guildId, channelId) {
        const config = this.readConfig();
        
        if (!config[guildId]) {
            config[guildId] = {};
        }

        config[guildId].logChannel = channelId;
        this.writeConfig(config);
    }

    getLogChannel(guildId) {
        const config = this.readConfig();
        return config[guildId]?.logChannel || null;
    }
}

module.exports = Database;
