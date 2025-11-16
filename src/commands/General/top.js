const { Command } = require('@sapphire/framework');
const Discord = require('discord.js');
const config = require('../../config');
const { client } = require('../../index');
const { Time } = require('@sapphire/time-utilities');

class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			// Any Command options you want here
			name: 'top',
			description: '[LIST-USERS] ראו את השרתים בטופ 🏆',
			cooldownDelay: Time.Minute * 5
		});
	}

	/**
	 * @param {Command.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	/**
	 * @param {Command.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		// const allServers = await client.db.getServers({
		// 	sort: true
		// });
		const topServers = await this.container.prisma.servers.findMany({
			take: 5,
			orderBy: {
				votes: 'desc'
			}
		})

		console.log(topServers)
		const formattedServers =
			topServers?.length > 0 ?
				topServers.map((server, index) => {
					const verifiedPrefix = server.verified ? config.emojis.verified : '';
					return `${this.getTopIcon(index + 1)}. **${verifiedPrefix}[${server.name}](https://discord.com/channels/${interaction.guild.id}/${server.channelID}) - ${server.votes} הצבעות!**\n`;
				}).join('\n')
				: 'לא נמצאו שרתים בטופ הרשימה'
		return interaction.reply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle('🏆 שרתים בטופ הרשימה 🏆')
					.setDescription(formattedServers)
					.setFooter({
						text: 'בהצלחה לכולם!'
					})
					.setColor(Discord.Colors.Blurple)
			]
		});
	}

	getTopIcon(pos) {
		if (pos == 1) {
			return '\🥇';
		} else if (pos == 2) {
			return '\🥈';
		} else if (pos == 3) {
			return '\🥉';
		} else {
			return `\`${pos}.\``;
		}
	}
}

module.exports = {
	UserCommand
};
