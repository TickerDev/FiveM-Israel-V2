const Discord = require('discord.js');
require('dotenv').config();
const config = require('../config');
const { categories } = config;

class ClientUtil {
	constructor(client) {
		this.client = client;
	}

	isInviteValid(code) {
		fetch(`https://discordapp.com/api/invite/${code}`)
			.then((res) => res.json())
			.then((json) => {
				if (json.message === 'Unknown Invite') {
					console.log(true);
				} else {
					console.log(false);
				}
			});
	}

	sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async sortChannels(guild, categoryID) {
		if (categoryID) {
			const category = categories.find((c) => c.type == categoryID);
			if (!category) return;

			const allServers = await this.client.db.getServers({
				category: categoryID,
				sort: true,
			});

			if (allServers && allServers.length > 0) {
				const channels = guild.channels.cache
					.filter(
						(channel) =>
							channel.type == Discord.ChannelType.GuildText &&
							channel.parentId == category.parentId &&
							channel.position !== 0
					)
					.toJSON();
				for (const channel of channels) {
					const server = await this.client.db.getServer(channel.id);
					if (!server) return;
					const channelAbove = guild.channels.cache.find(
						(x) =>
							x.parentId == channel.parentId &&
							x.position == channel.position - 1
					);

					const server2 = await this.client.db.getServer(channelAbove.id);
					if (channelAbove.position < channel.position) {
						if (server2.votes < server.votes) {
							await channel.setPosition(channelAbove.position);
						}
					}
				}
			}
		}
	}
}

module.exports = ClientUtil;
