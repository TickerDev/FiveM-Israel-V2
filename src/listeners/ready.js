const { Listener } = require('@sapphire/framework');
const { blue, gray, green, magenta, magentaBright, white, yellow } = require('colorette');
const SortClass = require('../custom/functions');
const dev = process.env.NODE_ENV !== 'production';
const style = dev ? yellow : blue;
const config = require('../config');
const { client } = require('../index');
const sorting = new SortClass(client);
const Discord = require('discord.js');
class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			once: false
		});
	}

	async run() {
		const guild = client.guilds.cache.get(config.guildId);
		if (guild) {
			await this.updateActivity(guild);

			setInterval(() => this.sortChannelsAndUpdate(guild), 1000 * 60 * 10);
			setInterval(() => this.updateActivity(guild), 5 * 60 * 1000);
		}
	}
	async sortChannelsAndUpdate(guild) {
		try {
			await this.sortAndRenameChannels(guild, config.categories);
		} catch (error) {
			console.error('Error during channel sorting and renaming:', error);
		}
	}

	async sortAndRenameChannels(guild, categories) {
		for (const category of categories) {
			try {
				await sorting.sortChannels(guild, category.type);
			} catch (error) {
				console.error(`Error sorting channels for category ${category.parentId}:`, error);
			}
		}
	}
	async updateActivity(guild) {
		try {
			const counter = await client.db.getServerCount();

			client.user.setActivity({
				type: Discord.ActivityType.Watching,
				name: `${Number(guild.memberCount).toLocaleString()} members | ${counter} servers in list`
			});
		} catch (error) {
			console.error('Error updating activity:', error);
		}
	}

	async frozenServers() {
		const frozenServers = await client.db.getFrozenServers();
		if (frozenServers.length > 0) {
			console.log(`Restoring permissions for ${frozenServers.length} frozen servers...`);

			for (const server of frozenServers) {
				try {
					const channel = await client.channels.fetch(server.channelID);
					if (channel) {
						await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
							ViewChannel: false
						});
						console.log(`Restored frozen state for channel: ${server.channelID}`);
					}
				} catch (error) {
					console.error(`Error restoring frozen state for channel ${server.channelID}:`, error);
				}
			}
		}
	}
	printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		const pad = ' '.repeat(7);

		console.log(
			String.raw`
${line01} ${pad}${blc('1.0.0')}
${line02} ${pad}[${success}] Gateway
${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}
}

module.exports = {
	UserEvent
};
