const { Command } = require('@sapphire/framework');
const Discord = require('discord.js');
const config = require('../../config');
const { client } = require('../../index');

class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			// Any Command options you want here
			name: 'info',
			description: '[LIST-USERS] קבלו מידע על שרת',
			cooldownDelay: 5 * 1000
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
				.addChannelOption((o) =>
					o.setName('channel').setDescription('בחרו שרת').setRequired(true).addChannelTypes(Discord.ChannelType.GuildText)
				)
		);
	}

	/**
	 * @param {Command.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		//      console.log(channel)
		const channel = interaction.options.getChannel('channel');
		//console.log(channel)
		const server = await client.db.getServer(channel.id);

		const allServers = await client.db.getServers({
			sort: true,
			category: server.category
		});
		const index = allServers.findIndex((s) => s.channelID === server.channel_id);
		let serverAbove = allServers[index - 1];
		const owner = await interaction.guild.members.fetch(server.owner_id);
		// Add verified emoji to title if server is verified
		const titlePrefix = server.verified ? config.emojis.verified : '';
		return interaction.reply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle(`${titlePrefix} מידע על ${server.name}`)
					.addFields([
						{
							name: 'מנהל',
							value: `${owner.user.globalName} (<@${owner.id}>)`
						},
						{
							name: 'הצבעות',
							value: `**${server.votes}**`
						},
						{
							name: 'מקום',
							value:
								index == 0
									? 'מקום ראשון'
									: `**${channel.position} - דרושים עוד \`${server.votes - serverAbove.votes}\` הצבעות על מנת לעלות מקום!`
						}
					])
					.setThumbnail(server.image)
					.setColor(Discord.Colors.Blurple)
			]
		});
	}
}

module.exports = {
	UserCommand
};
