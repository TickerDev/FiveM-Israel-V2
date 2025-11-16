const { QuickDB } = require('quick.db');
const { Client } = require('discord.js');
class SeasonsSystem {
	/**
	 * @param {object} options
	 * @param {Client} options.client - The Discord.js client
	 * @param {Array} options.categories - Array of categories { type: string, parentId: string }
	 * @param {string} options.resultChannelId - The channel ID where results will be posted
	 * @param {QuickDB} options.db - An instance of QuickDB
	 * @param {number} options.seasonDurationMs - The duration of each season in milliseconds (can be very large)
	 */
	constructor({ client, categories, resultChannelId, db, seasonDurationMs }) {
		this.client = client;
		this.categories = categories;
		this.resultChannelId = resultChannelId;
		this.db = db;
		this.timeoutId = null;
		this.seasonDurationMs = seasonDurationMs;

		this.MAX_DELAY = 2147483647;
	}

	/**
	 * Initialize the season system:
	 * If there is a saved `seasonNextRun` date, it schedules the season end.
	 * If not, it logs that no active season is found.
	 */
	async initialize() {
		const nextRunISO = await this.db.get('seasonNextRun');
		if (!nextRunISO) {
			console.log('No active season found. Call startSeason() to begin a new one.');
			return;
		}

		const nextRunDate = new Date(nextRunISO);
		this.scheduleNextRun(nextRunDate);
	}

	/**
	 * Start a new season:
	 * - Compute next run date (now + seasonDurationMs)
	 * - Save it
	 * - Increment season number
	 * - Enable votes
	 * - Schedule the season end
	 */
	async startSeason() {
		const nextRunDate = this.computeNextRunDate();
		await this.db.set('seasonNextRun', nextRunDate.toISOString());

		const currentSeason = await this.getCurrentSeasonNumber();
		await this.db.set('seasonNumber', currentSeason + 1);

		await this.enableVotes();
		console.log(`A new season has started! Season number: ${currentSeason + 1}`);
		this.scheduleNextRun(nextRunDate);
	}

	/**
	 * Compute the next run date: now + seasonDurationMs
	 * @returns {Date}
	 */
	computeNextRunDate() {
		return new Date(Date.now() + this.seasonDurationMs);
	}

	/**
	 * scheduleNextRun tries to set a timeout for the full remaining time.
	 * If remaining > MAX_DELAY, it schedules MAX_DELAY, and after it fires, calls scheduleNextRun again.
	 * This repeats until remaining <= MAX_DELAY.
	 * @param {Date} nextRunDate
	 */
	scheduleNextRun(nextRunDate) {
		const now = Date.now();
		let remaining = nextRunDate.getTime() - now;

		if (remaining <= 0) {
			this.runSeasonJob();
			return;
		}

		const delay = Math.min(remaining, this.MAX_DELAY);

		this.timeoutId = setTimeout(() => {
			const nowCheck = Date.now();
			remaining = nextRunDate.getTime() - nowCheck;

			if (remaining <= 0) {
				this.runSeasonJob();
			} else {
				this.scheduleNextRun(nextRunDate);
			}
		}, delay);

		console.log(`Season scheduled to end at: ${nextRunDate}`);
	}

	/**
	 * runSeasonJob calls endSeason and then clears seasonNextRun.
	 * After this, no new season starts automatically.
	 */
	async runSeasonJob() {
		try {
			await this.endSeason();
		} catch (error) {
			console.error('Error running season job:', error);
		}

		await this.db.delete('seasonNextRun');
		console.log('Season ended. To start a new season, call startSeason().');
	}

	/**
	 * End the current season:
	 * - Fetch top servers per category
	 * - Announce in the result channel
	 * - Send DMs to winners
	 * - Disable votes
	 */
	async endSeason() {
		const resultChannel = this.client.channels.cache.get(this.resultChannelId);
		if (!resultChannel) {
			console.error(`Result channel with ID ${this.resultChannelId} not found.`);
			return;
		}

		const seasonNumber = await this.getCurrentSeasonNumber();

		const categoryDisplayMap = [
			{ type: 'whitelist', display: 'שרתי וויטליסט/אלווליסט' },
			{ type: 'public', display: 'שרתי פאבליק' },
			{ type: 'fun', display: 'שרתי כיף (פאן)' },
			{ type: 'shop', display: 'חנויות' },
			{ type: 'hosting', display: 'חברות אחסון' }
		];

		let messageContent =
			`-# בס"ד\n\n**וואו!** עונה ${seasonNumber} הסתיימה הרגע! 🤛🤜\n` +
			`אנחנו מעריכים כל מנהל, מפתח, ושחקן ששם את האמון שלו בנו 💞\n` +
			`ועכשיו **לתוצאות! 😼**\n\n`;

		for (const cat of categoryDisplayMap) {
			const topServers = await this.client.db.getTopServers(cat.type);
			messageContent += `## *__${cat.display}__*\n`;
			messageContent += `במקום ראשון:\n`;

			if (topServers && topServers.length > 0) {
				messageContent += `||\t${topServers[0] ? `🏆 **<#${topServers[0].channelID}> עם ${topServers[0].votes} הצבעות!**` : 'No top server found.'}||\n`;
			} else {
				messageContent += `\tווטאפ\n\n`;
				continue;
			}

			messageContent += `במקום שני:\n`;
			if (topServers[1]) {
				messageContent += `\t🥈 **||<#${topServers[1].channelID}> עם ${topServers[1].votes} הצבעות!||**\n`;
			} else {
				messageContent += `\tאין\n`;
			}

			messageContent += `במקום שלישי:\n`;
			if (topServers[2]) {
				messageContent += `\t🥉 **||<#${topServers[2].channelID}> עם ${topServers[2].votes} הצבעות!||**\n\n`;
			} else {
				messageContent += `\tאין\n\n`;
			}
		}

		messageContent +=
			`**מזל טוב למנצחים!** נתתם פייט אמיתי 👊\n` +
			`ולמי שלא ניצח, תנו לעונה הזאתי להיות העונה שלכם! 😼\n\n` +
			`**תזכורת!** מקומות ראשונים בכל קטגוריה הולכים לקבל **תעודת הוקרה במציאות!**, יש על מה להלחם 🏆\n\n` +
			`תודה לכל המשתתפים בעונה ${seasonNumber}!`;

		await resultChannel.send(messageContent);
		await this.disableVotes();
		console.log('Season ended, votes disabled.');
	}

	/**
	 * Get the current season number from the DB. Default to 0 if not set.
	 */
	async getCurrentSeasonNumber() {
		const seasonNumber = await this.db.get('seasonNumber');
		return seasonNumber || 0;
	}

	async enableVotes() {
		await this.db.set('votes', true);
		console.log('Votes have been enabled.');
	}

	async disableVotes() {
		await this.db.set('votes', false);
		console.log('Votes have been disabled.');
	}
}

module.exports = SeasonsSystem;
