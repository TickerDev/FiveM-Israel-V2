const Discord = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const config = require('../config');
module.exports = class Ticket {
	// Instance Variables
	/**
	 * @type {Discord.Guild | null}
	 */
	guild = null;
	/**
	 * @type {Discord.Role | null}
	 */
	staffRole = null;
	/**
	 *
	 * @param {object} options
	 * @param {Discord.Client} options.client
	 * @param {string} options.userId
	 * @param {string} options.type
	 * @param {string} options.logs
	 * @param {string} options.staffId
	 * @param {string} options.guildId
	 */
	constructor({ client, userId, type, logs, staffId, guildId }) {
		this.client = client;
		this.userId = userId;
		this.type = type;
		this.logsChannel = logs;
		this.staffId = staffId;
		this.guildId = guildId;
	}

	async checkIds(guildId, staffId) {
		if (!guildId) throw new TypeError('No guild id provided');
		try {
			this.guild = await this.client.guilds.fetch(guildId);
		} catch {
			throw new TypeError(`Guild id: ${guildId} is invalid.`);
		}
		if (!staffId) throw new TypeError('No staff id provided');
		try {
			this.staffRole = await this.guild.roles.fetch(staffId);
			if (!this.staffRole) throw new TypeError(`Staff role id: ${staffId} is invalid.`);
		} catch {
			throw new TypeError(`Staff id: ${staffId} is invalid.`);
		}
	}

	/**
	 * Sanitize username by removing special characters
	 * @param {string} username
	 * @returns {string} sanitized username
	 */
	#sanitizeUsername(username) {
		return username.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '');
	}

	async #checkIfUserHasTicketOpened(userId) {
		let ticket = null;
		await this.checkIds(this.guildId, this.staffId);

		const user = await this.guild.members.fetch(userId).catch(() => null);
		if (!user) return null;

		const username = this.#sanitizeUsername(user.user.username);
		const channels = this.guild.channels.cache.filter((c) =>
			[config.tickets.addServers, config.tickets.blacklist, config.tickets.others, config.tickets.question, config.tickets.role].includes(
				c.parentId
			)
		);
		if (!channels.size) return null;

		// Check if any channel name contains the username
		for (let c of channels.values()) {
			if (c.name.includes(username)) {
				ticket = c;
				break;
			}
		}
		return ticket;
	}
	/**
	 * @returns boolean | User has an open ticket
	 */
	get hasTicketOpen() {
		return this.#checkIfUserHasTicketOpened(this.userId);
	}

	/**
	 * @param {Discord.User} user
	 * @param {string} reason
	 */
	async createTicket(reason) {
		await this.checkIds(this.guildId, this.staffId);
		const member = (await this.guild.members.fetch(this.userId)) || null;
		if (!member) return null;
		const user = member.user;
		let type = this.type;
		let channel = null;
		let successful = true;
		switch (type) {
			case 'general':
				await this.guild.channels
					.create({
						name: `${this.#sanitizeUsername(user.username)}-כללי`,
						reason: 'Created a ticket for ' + user.username,
						parent: config.tickets.question,
						topic: user.id,
						permissionOverwrites: [
							{
								id: user.id,
								allow: ['ViewChannel']
							},
							{
								id: this.guild.roles.everyone,
								deny: ['ViewChannel']
							},
							{
								id: this.staffRole,
								allow: ['ViewChannel']
							}
						]
					})
					.then((c) => {
						c.send({
							embeds: [
								new Discord.EmbedBuilder().setColor(config.embed_color).setTitle(`${c.name}`).addFields(
									{
										name: 'שם',
										value: user.displayName
									},
									{
										name: 'סיבה',
										value: reason
									}
								)
							],
							content: `${user} ${this.staffRole}`,
							components: [
								new Discord.ActionRowBuilder().addComponents([
									new Discord.ButtonBuilder()
										.setCustomId(`staff_option`)
										.setStyle(Discord.ButtonStyle.Primary)
										.setLabel('Staff Options')
								])
							]
						});
						successful = true;
						channel = c;
					})
					.catch((err) => {
						console.error(err);
						channel = null;
						successful = false;
					});
				break;
			case 'roles':
				await this.guild.channels
					.create({
						name: `${this.#sanitizeUsername(user.username)}-רול`,
						reason: 'Created a ticket for ' + user.username,
						parent: config.tickets.role,
						topic: user.id,
						permissionOverwrites: [
							{
								id: user.id,
								allow: ['ViewChannel']
							},
							{
								id: this.guild.roles.everyone,
								deny: ['ViewChannel']
							},
							{
								id: this.staffRole,
								allow: ['ViewChannel']
							}
						]
					})
					.then((c) => {
						c.send({
							embeds: [
								new Discord.EmbedBuilder()
									.setColor(config.embed_color)
									.setTitle(`${c.name}`)
									.addFields(
										{
											name: 'שם',
											value: `${user.displayName} (<@${user.id}>)`
										},
										{
											name: 'רול',
											value: reason
										}
									)
							],
							content: `${user} ${this.staffRole}`,
							components: [
								new Discord.ActionRowBuilder().addComponents([
									new Discord.ButtonBuilder()
										.setCustomId(`staff_option`)
										.setStyle(Discord.ButtonStyle.Primary)
										.setLabel('Staff Options')
								])
							]
						});
						successful = true;
						channel = c;
					})
					.catch((err) => {
						console.error(err);
						channel = null;
						successful = false;
					});
				break;
			default:
				channel = null;
				break;
		}
		if (this.logsChannel && (await this.client.channels.fetch(this.logsChannel)) && successful) {
			const logs = await this.guild.channels.fetch(this.logsChannel);
			const user = await this.guild.members.fetch(this.userId);
			logs.send({
				embeds: [
					new Discord.EmbedBuilder()
						.setTitle('טיקט חדש נפתח')
						.setFields(
							{
								name: 'משתמש',
								value: `${this.userId} | (<@${this.userId}>)`,
								inline: true
							},
							{
								name: 'סוג',
								value: type,
								inline: true
							}
						)
						.setColor(config.embed_color)
						.setThumbnail(user.avatarURL())
				]
			});
		}
		return channel;
	}
};
